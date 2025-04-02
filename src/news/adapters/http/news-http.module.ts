import { Module } from '@nestjs/common';
import { NewsController } from './controllers/news.controller';
import { NewsApplicationModule } from '../../application/news-application.module';

@Module({
  imports: [NewsApplicationModule],
  controllers: [NewsController],
})
export class NewsHttpModule {} 