export class SourceReferenceDto {
  title: string;
  url: string;
  date: string;
}

export class QueryResponseDto {
  answer: string;
  sources: SourceReferenceDto[];
} 