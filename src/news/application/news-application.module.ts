import { Module, forwardRef } from '@nestjs/common';
import { ProcessArticleUseCase } from './use-cases/process-article.use-case';
import { QueryNewsUseCase } from './use-cases/query-news.use-case';
import { StartIngestionUseCase } from './use-cases/start-ingestion.use-case';
import { NewsInfraModule } from '../infra/news-infra.module';

@Module({
  imports: [
    forwardRef(() => NewsInfraModule),
  ],
  providers: [
    {
      provide: 'ProcessArticlePort',
      useClass: ProcessArticleUseCase
    },
    {
      provide: 'QueryNewsPort',
      useClass: QueryNewsUseCase
    },
    {
      provide: 'StartIngestionPort',
      useClass: StartIngestionUseCase
    }
  ],
  exports: [
    'ProcessArticlePort',
    'QueryNewsPort',
    'StartIngestionPort'
  ],
})
export class NewsApplicationModule {} 