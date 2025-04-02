import { Article } from '../entities/article.entity';
import { Maybe } from '@sweet-monads/maybe';
import { Either } from '@sweet-monads/either';

export interface ArticleRepository {
  save(article: Article): Promise<Maybe<Error>>;
  findByUrl(url: string): Promise<Either<Error, Maybe<Article>>>;
  searchSimilar(query: string, limit: number): Promise<Either<Error, Article[]>>;
} 