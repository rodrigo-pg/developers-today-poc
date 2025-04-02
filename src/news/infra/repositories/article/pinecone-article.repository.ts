import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { ArticleRepository } from '../../../domain/repositories/article.repository.interface';
import { Article } from '../../../domain/entities/article.entity';
import { LlmService } from '../../../domain/services/llm.interface';
import { createHash } from "crypto"
import { just, Maybe, none } from '@sweet-monads/maybe';
import { Either, left, right } from '@sweet-monads/either';

@Injectable()
export class PineconeArticleRepository implements ArticleRepository {
  private readonly logger = new Logger(PineconeArticleRepository.name);
  private pinecone: Pinecone;
  private indexName: string;

  constructor(
    @Inject(ConfigService)
    private configService: ConfigService,
    @Inject('LlmService')
    private llmService: LlmService,
  ) {
    this.pinecone = new Pinecone({
      apiKey: this.configService.get<string>('PINECONE_API_KEY'),
    });
    this.indexName = this.configService.get<string>('PINECONE_INDEX_NAME');
  }

  private generateArticleHash(url: string) {
    return createHash('sha256').update(url).digest('hex');
  }

  async save(article: Article): Promise<Maybe<Error>> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const textToEmbed = `${article.title} ${article.content}`;
      
      const embeddingResult = await this.llmService.generateEmbedding(textToEmbed);
      
      if (embeddingResult.isLeft()) {
        return just(embeddingResult.value);
      }
      
      const embedding = embeddingResult.value;
      const hash = this.generateArticleHash(article.url);

      await index.upsert([{
        id: hash,
        values: embedding,
        metadata: {
          id: article.id,
          title: article.title,
          url: article.url,
          date: article.date,
          content: article.content.substring(0, 8000),
        },
      }]);
      
      this.logger.log(`Stored article in Pinecone: ${article.title}`);
      return none();
    } catch (error) {
      this.logger.error(`Failed to store article in Pinecone: ${error.message}`);
      return just(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async findByUrl(url: string): Promise<Either<Error, Maybe<Article>>> {
    try {
      const hash = this.generateArticleHash(url);
      const index = this.pinecone.Index(this.indexName);
      const queryResponse = await index.query({
        id: hash,
        topK: 1,
        includeMetadata: true,
      });
      
      const match = queryResponse.matches.find(m => m.metadata.url === url);
      
      if (!match) return right(none());
      
      return right(just(new Article(
        String(match.metadata.id),
        String(match.metadata.title),
        String(match.metadata.content),
        String(match.metadata.url),
        String(match.metadata.date),
      )));
    } catch (error) {
      this.logger.error(`Error finding article by URL: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async searchSimilar(query: string, limit = 5): Promise<Either<Error, Article[]>> {
    try {
      const embeddingResult = await this.llmService.generateEmbedding(query);
      
      return embeddingResult.asyncChain(async queryEmbedding => {
        const index = this.pinecone.Index(this.indexName);
        const queryResponse = await index.query({
          vector: queryEmbedding,
          topK: limit,
          includeMetadata: true,
        });
        
        const articles = queryResponse.matches.map(match => new Article(
          String(match.metadata.id),
          String(match.metadata.title),
          String(match.metadata.content),
          String(match.metadata.url),
          String(match.metadata.date)
        ));
        
        return right(articles);
      });
    } catch (error) {
      this.logger.error(`Error searching similar articles: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }
} 