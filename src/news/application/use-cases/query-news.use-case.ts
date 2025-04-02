import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueryNewsPort } from '../ports/query-news.port';
import { ArticleRepository } from '../../domain/repositories/article.repository.interface';
import { LlmService, QueryResponse } from '../../domain/services/llm.interface';
import { ProcessArticlePort } from '../ports/process-article.port';
import { Article } from 'src/news/domain/entities/article.entity';
import { Either, right } from '@sweet-monads/either';

@Injectable()
export class QueryNewsUseCase implements QueryNewsPort {
  private readonly logger = new Logger(QueryNewsUseCase.name);

  constructor(
    @Inject('ArticleRepository')
    private readonly articleRepository: ArticleRepository,
    @Inject('LlmService')
    private readonly llmService: LlmService,
    @Inject('ProcessArticlePort')
    private readonly processArticleUseCase: ProcessArticlePort,
  ) {}

  async execute(query: string): Promise<Either<Error, QueryResponse>> {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = query.match(urlRegex);
      const relevantArticles: Article[] = [];

      if (urls && urls.length > 0) {
        for (const url of urls) {
          const processResult = await this.processArticleUseCase.execute(url);
          
          if (processResult.isLeft()) {
            this.logger.error(`Failed to process URL: ${processResult.value.message}`);
            continue;
          }
          
          relevantArticles.push(processResult.value);
        }
      } else {
        const searchResult = await this.articleRepository.searchSimilar(query, 5);
        
        if (searchResult.isRight()) {
          relevantArticles.push(...searchResult.value);
        } else {
          this.logger.error(`Error searching similar articles: ${searchResult.value.message}`);
        }
      }
      
      return this.llmService.generateAnswer(query, relevantArticles);
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);
      return right({
        answer: "I'm sorry, I encountered an error while processing your query. Please try again later.",
        sources: [],
      });
    }
  }
} 