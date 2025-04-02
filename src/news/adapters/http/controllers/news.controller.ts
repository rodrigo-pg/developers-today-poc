import { Controller, Post, Body, Logger, Inject, HttpCode, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { QueryRequestDto } from '../dtos/query-request.dto';
import { QueryResponseDto } from '../dtos/query-response.dto';
import { QueryNewsPort } from '../../../application/ports/query-news.port';

@Controller('agent')
export class NewsController {
  private readonly logger = new Logger(NewsController.name);

  constructor(
    @Inject('QueryNewsPort')
    private readonly queryNewsUseCase: QueryNewsPort
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async processQuery(@Body() request: QueryRequestDto): Promise<QueryResponseDto> {
    this.logger.log(`Received query: ${request.query}`);
    const resultEither = await this.queryNewsUseCase.execute(request.query);
    
    return resultEither.mapLeft(error => {
      this.logger.error(`Error in query processing: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }).value;
  }
} 