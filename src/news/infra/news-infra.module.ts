import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiLlmService } from './services/llm/openai-llm.service';
import { CheerioContentExtractor } from './services/content-extractor/cheerio-content-extractor.service';
import { PineconeArticleRepository } from './repositories/article/pinecone-article.repository';
import { KafkaDataIngestion } from './services/data-ingestion/kafka-data-ingestion.service';
import { NewsApplicationModule } from '../application/news-application.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => NewsApplicationModule),
  ],
  providers: [
    {
      provide: 'LlmService',
      useClass: OpenAiLlmService,
    },
    {
      provide: 'ContentExtractor',
      useClass: CheerioContentExtractor,
    },
    {
      provide: 'ArticleRepository',
      useClass: PineconeArticleRepository,
    },
    {
      provide: 'DataIngestion',
      useClass: KafkaDataIngestion,
    },
  ],
  exports: [
    'LlmService',
    'ContentExtractor',
    'ArticleRepository',
    'DataIngestion',
  ],
})
export class NewsInfraModule {} 