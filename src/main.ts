import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import helmet from 'helmet';
import { StartIngestionPort } from './news/application/ports/start-ingestion.port';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  
  // Start data ingestion
  // const startIngestionUseCase = app.get<StartIngestionPort>('StartIngestionPort');
  // startIngestionUseCase.execute()
  //   .catch(error => logger.error(`Failed to start ingestion: ${error.message}`));
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();
