import { Module } from '@nestjs/common';
import { NewsApplicationModule } from './application/news-application.module';
import { NewsInfraModule } from './infra/news-infra.module';
import { NewsAdaptersModule } from './adapters/news-adapters.module';

@Module({
  imports: [
    NewsApplicationModule,
    NewsInfraModule,
    NewsAdaptersModule,
  ],
  exports: [
    NewsApplicationModule,
    NewsInfraModule,
    NewsAdaptersModule,
  ],
})
export class NewsModule {} 