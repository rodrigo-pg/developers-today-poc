import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmService, QueryResponse } from '../../../domain/services/llm.interface';
import { Article } from '../../../domain/entities/article.entity';
import { Either, left, right } from '@sweet-monads/either';

@Injectable()
export class OpenAiLlmService implements LlmService {
  private readonly logger = new Logger(OpenAiLlmService.name);
  private openai: OpenAI;
  private langfuse: any | null = null;
  private langfuseEnabled: boolean;

  constructor(
    @Inject(ConfigService)
    private configService: ConfigService
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    
    this.langfuseEnabled = this.configService.get<string>('LANGFUSE_ENABLED') === 'true';
    
    if (this.langfuseEnabled) {
      import('langfuse').then(module => {
        const Langfuse = module.Langfuse;
        this.langfuse = new Langfuse({
          publicKey: this.configService.get<string>('LANGFUSE_PUBLIC_KEY'),
          secretKey: this.configService.get<string>('LANGFUSE_SECRET_KEY'),
          baseUrl: this.configService.get<string>('LANGFUSE_HOST', 'https://cloud.langfuse.com')
        });
        this.logger.log('Langfuse monitoring enabled');
      }).catch(err => {
        this.logger.error(`Failed to initialize Langfuse: ${err.message}`);
      });
    }
  }

  async generateEmbedding(text: string): Promise<Either<Error, number[]>> {
    let trace = null;
    let span = null;
    let startTime = 0;
    
    if (this.langfuseEnabled && this.langfuse) {
      trace = this.langfuse.trace({
        name: 'generate_embedding',
        metadata: {
          textLength: text.length,
        }
      });
      
      span = trace.span({
        name: 'openai_embedding',
        input: { text: text.substring(0, 100) + '...' }
      });
      
      startTime = Date.now();
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
      });
      
      if (this.langfuseEnabled && span && trace && this.langfuse) {
        const endTime = Date.now();
        
        span.end({
          output: { 
            dimensions: response.data[0].embedding.length,
            model: 'text-embedding-3-small'
          },
          metadata: { latency: endTime - startTime }
        });
        
        trace.update({ metadata: { status: 'success' } });
      }
      
      return right(response.data[0].embedding);
    } catch (error) {
      if (this.langfuseEnabled && trace && this.langfuse) {
        trace.update({
          metadata: { 
            status: 'error',
            errorMessage: error.message 
          }
        });
      }
      
      this.logger.error(`Error generating embedding: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async generateAnswer(query: string, relevantArticles: Article[]): Promise<Either<Error, QueryResponse>> {
    let trace = null;
    let span = null;
    let startTime = 0;
    
    if (this.langfuseEnabled && this.langfuse) {
      trace = this.langfuse.trace({
        name: 'generate_answer',
        metadata: {
          query,
          articleCount: relevantArticles.length,
        }
      });
    }

    try {
      const formattedContext = relevantArticles
        .map(article => `Title: ${article.title}\nURL: ${article.url}\nDate: ${article.date}\nContent: ${article.content.substring(0, 1000)}...\n\n`)
        .join('---\n');

      const prompt = `
        Answer the following query based on the provided context. If the context doesn't contain relevant information,
        acknowledge that you don't have enough information to provide a complete answer.
        
        Query: ${query}
        
        Context:
        ${formattedContext}
        
        Provide your answer in JSON format with two fields:
        - answer: Your detailed and informative response
        - sources: An array of sources you used, each with title, url, and date fields
      `;

      if (this.langfuseEnabled && trace && this.langfuse) {
        span = trace.span({
          name: 'openai_chat_completion',
          input: { 
            query,
            contextSize: formattedContext.length,
            articleCount: relevantArticles.length
          }
        });
        
        startTime = Date.now();
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      const parsedResult = JSON.parse(resultText);
      
      if (this.langfuseEnabled && span && trace && this.langfuse) {
        const endTime = Date.now();
        
        span.end({
          output: {
            model: 'gpt-4o-mini',
            responseLength: resultText.length,
            hasAnswer: !!parsedResult.answer,
            sourceCount: parsedResult.sources?.length || 0
          },
          metadata: { latency: endTime - startTime }
        });
        
        this.langfuse.generation({
          name: 'answer_generation',
          traceId: trace.id,
          model: 'gpt-4o-mini',
          modelParameters: {
            temperature: 0,
            response_format: 'json_object'
          },
          usage: {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens
          }
        });
        
        trace.update({ metadata: { status: 'success' } });
      }
      
      return right(parsedResult);
    } catch (error) {
      if (this.langfuseEnabled && trace && this.langfuse) {
        trace.update({
          metadata: { 
            status: 'error',
            errorMessage: error.message 
          }
        });
      }
      
      this.logger.error(`Error generating answer: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }
} 