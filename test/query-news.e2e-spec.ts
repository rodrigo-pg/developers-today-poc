import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from 'src/app.module';
import { ProcessArticlePort } from 'src/news/application/ports/process-article.port';
import * as request from 'supertest';

describe('QueryNews API (E2E)', () => {
  let app: INestApplication;
  let httpServer: any;
  let processArticleUseCase: ProcessArticlePort;
  let testArticleUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();

    processArticleUseCase = app.get<ProcessArticlePort>('ProcessArticlePort');
    
    const configService = app.get(ConfigService);
    testArticleUrl = configService.get<string>('TEST_ARTICLE_URL') || 
      'https://en.wikipedia.org/wiki/Artificial_intelligence';
    
    await processArticleUseCase.execute(testArticleUrl);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('should provide an answer for a topical query via HTTP', async () => {
    const response = await request(httpServer)
      .post('/agent')
      .send({ query: 'What is artificial intelligence?' })
      .expect(200);
    
    expect(response.body).toBeDefined();
    expect(response.body.answer).toBeTruthy();
    expect(response.body.answer.length).toBeGreaterThan(50);
    expect(response.body.sources).toBeInstanceOf(Array);
  }, 60000);

  it('should process and answer queries about new URLs', async () => {
    const newUrl = 'https://en.wikipedia.org/wiki/Deep_learning';
    
    const response = await request(httpServer)
      .post('/agent')
      .send({ query: `What this article: ${newUrl} says about deep learning ?` })
      .expect(200);
    
    expect(response.body).toBeDefined();
    expect(response.body.answer).toBeTruthy();
    expect(response.body.answer.length).toBeGreaterThan(50);
    expect(response.body.sources).toBeInstanceOf(Array);
    expect(response.body.sources.length).toBeGreaterThan(0);
    
    const sourceUrls = response.body.sources.map(s => s.url);
    expect(sourceUrls).toContain(newUrl);
  }, 90000);
}); 