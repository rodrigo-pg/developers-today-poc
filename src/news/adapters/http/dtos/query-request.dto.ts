import { IsNotEmpty, IsString } from 'class-validator';

export class QueryRequestDto {
  @IsString()
  @IsNotEmpty()
  query: string;
} 