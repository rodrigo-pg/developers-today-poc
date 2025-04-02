import { Inject, Injectable, Logger } from '@nestjs/common';
import { Maybe, just, none } from '@sweet-monads/maybe';
import { Either, left, right } from '@sweet-monads/either';
import { v4 as uuidv4 } from 'uuid';
import { Article } from '../../domain/entities/article.entity';
import { ArticleRepository } from '../../domain/repositories/article.repository.interface';
import { ContentExtractor } from '../../domain/services/content-extractor.interface';
import { ProcessArticlePort } from '../ports/process-article.port';

@Injectable()
export class ProcessArticleUseCase implements ProcessArticlePort {
  private readonly logger = new Logger(ProcessArticleUseCase.name);

  constructor(
    @Inject('ContentExtractor')
    private readonly contentExtractor: ContentExtractor,
    @Inject('ArticleRepository')
    private readonly articleRepository: ArticleRepository,
  ) {}

  async execute(url: string): Promise<Either<Error, Article>> {
    try {
      const existingArticleResult = await this.articleRepository.findByUrl(url);
      
      if (existingArticleResult.isLeft()) {
        return left(existingArticleResult.value);
      }
      
      const existingArticleMaybe = existingArticleResult.value;
      
      if (existingArticleMaybe.isJust()) {
        this.logger.log(`Article already processed: ${url}`);
        return right(existingArticleMaybe.value);
      }

      const extractedContentResult = await this.contentExtractor.extractContent(url);
      
      if (extractedContentResult.isLeft()) {
        return left(extractedContentResult.value);
      }
      
      const extractedContent = extractedContentResult.value;
      
      const article = new Article(
        uuidv4(),
        extractedContent.title,
        extractedContent.content,
        url,
        extractedContent.date || new Date().toISOString().split('T')[0]
      );
      
      const saveResult = await this.articleRepository.save(article);
      
      if (saveResult.isJust()) {
        return left(saveResult.value);
      }
      
      this.logger.log(`Successfully processed article: ${url}`);
      return right(article);
    } catch (error) {
      this.logger.error(`Error processing article ${url}: ${error.message}`);
      return left(error instanceof Error ? error : new Error(String(error)));
    }
  }
} 