import { Maybe } from '@sweet-monads/maybe';

export interface StartIngestionPort {
  execute(): Promise<Maybe<Error>>;
} 