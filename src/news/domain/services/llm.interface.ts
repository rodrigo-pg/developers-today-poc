import { Article } from '../entities/article.entity';
import { Either } from '@sweet-monads/either';

export interface SourceReference {
  title: string;
  url: string;
  date: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceReference[];
}

export interface LlmService {
  generateEmbedding(text: string): Promise<Either<Error, number[]>>;
  generateAnswer(
    query: string, 
    relevantArticles: Article[]
  ): Promise<Either<Error, QueryResponse>>;
} 