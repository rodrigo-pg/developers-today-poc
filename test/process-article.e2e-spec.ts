import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ProcessArticlePort } from '../src/news/application/ports/process-article.port';
import { ArticleRepository } from '../src/news/domain/repositories/article.repository.interface';

describe('ProcessArticleUseCase (E2E)', () => {
  let app: INestApplication;
  let processArticleUseCase: ProcessArticlePort;
  let articleRepository: ArticleRepository;
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

    processArticleUseCase = app.get<ProcessArticlePort>('ProcessArticlePort');
    articleRepository = app.get<ArticleRepository>('ArticleRepository');
    
    const configService = app.get(ConfigService);
    testArticleUrl = configService.get<string>('TEST_ARTICLE_URL') || 
      'https://en.wikipedia.org/wiki/Artificial_intelligence';
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('should process an article and save it to the repository', async () => {
    await processArticleUseCase.execute(testArticleUrl);

    const savedArticle = await articleRepository.findByUrl(testArticleUrl);

    if (savedArticle.isLeft()) {
      fail('Expected right value but got left');
    } else {
      if (savedArticle.value.isNone()) {
        fail('Expected Some value but got None');
      }
      
      const article = savedArticle.value.value;
      
      expect(article).toBeDefined();
      expect(article.url).toBe(testArticleUrl);
      expect(article.title).toBeTruthy();
      expect(article.content.length).toBeGreaterThan(100);
      expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    }
  }, 60000);

  it('should not reprocess an article that already exists', async () => {
    const existingArticle = await articleRepository.findByUrl(testArticleUrl);
    expect(existingArticle).toBeTruthy();
    
    const saveSpy = jest.spyOn(articleRepository, 'save');
    
    await processArticleUseCase.execute(testArticleUrl);
    
    expect(saveSpy).not.toHaveBeenCalled();
    
    saveSpy.mockRestore();
  }, 30000);
}); 