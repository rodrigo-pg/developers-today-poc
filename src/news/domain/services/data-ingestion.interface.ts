import { Maybe } from '@sweet-monads/maybe';

export interface DataIngestion {
  startIngestion(): Promise<Maybe<Error>>;
  stopIngestion(): Promise<Maybe<Error>>;
} 