import { Module } from '@nestjs/common';
import { NewsHttpModule } from './http/news-http.module';

@Module({
  imports: [NewsHttpModule],
  exports: [NewsHttpModule],
})
export class NewsAdaptersModule {} 