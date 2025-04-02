import { Either } from '@sweet-monads/either';
import { Article } from '../../domain/entities/article.entity';

export interface ProcessArticlePort {
  execute(url: string): Promise<Either<Error, Article>>;
} 