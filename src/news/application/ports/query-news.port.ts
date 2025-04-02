import { QueryResponse } from '../../domain/services/llm.interface';
import { Either } from '@sweet-monads/either';

export interface QueryNewsPort {
  execute(query: string): Promise<Either<Error, QueryResponse>>;
} 