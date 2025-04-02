import { Either } from '@sweet-monads/either';

export interface ExtractedContent {
  title: string;
  content: string;
  date?: string;
}

export interface ContentExtractor {
  extractContent(url: string): Promise<Either<Error, ExtractedContent>>;
} 