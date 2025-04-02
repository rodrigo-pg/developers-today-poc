import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer } from 'kafkajs';
import { DataIngestion } from '../../../domain/services/data-ingestion.interface';
import { ProcessArticlePort } from '../../../application/ports/process-article.port';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { Maybe, just, none } from '@sweet-monads/maybe';

@Injectable()
export class KafkaDataIngestion implements DataIngestion, OnModuleDestroy {
  private readonly logger = new Logger(KafkaDataIngestion.name);
  private consumer: Consumer;
  private kafka: Kafka;
  private isRunning = false;

  constructor(
    @Inject(ConfigService)
    private configService: ConfigService,
    @Inject('ProcessArticlePort')
    private processArticleUseCase: ProcessArticlePort,
  ) {
    this.kafka = new Kafka({
      clientId: 'rag-news-app',
      brokers: [this.configService.get<string>('KAFKA_BROKER')],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username: this.configService.get<string>('KAFKA_USERNAME'),
        password: this.configService.get<string>('KAFKA_PASSWORD'),
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: `${this.configService.get<string>('KAFKA_GROUP_ID_PREFIX')}${Date.now()}`,
    });
  }

  async startIngestion(): Promise<Maybe<Error>> {
    if (this.isRunning) {
      this.logger.log('Ingestion already running');
      return none();
    }

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.configService.get<string>('KAFKA_TOPIC_NAME'),
        fromBeginning: true,
      });

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const url = message.value.toString();
            this.logger.log(`Received URL from Kafka: ${url}`);
            await this.processArticleUseCase.execute(url);
          } catch (error) {
            this.logger.error(`Error processing Kafka message: ${error.message}`);
          }
        },
      });

      this.isRunning = true;
      this.logger.log('Kafka data ingestion started');
      return none();
    } catch (error) {
      this.logger.error(`Failed to start Kafka ingestion: ${error.message}`);
      
      try {
        this.logger.log('Falling back to CSV data ingestion');
        await this.startCsvIngestion();
        return none();
      } catch (fallbackError) {
        return just(fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
      }
    }
  }

  private async startCsvIngestion(): Promise<void> {
    const csvFilePath = this.configService.get<string>('CSV_FALLBACK_PATH') || './articles_dataset.csv';
    
    if (!fs.existsSync(csvFilePath)) {
      this.logger.error(`CSV fallback file not found: ${csvFilePath}`);
      throw new Error(`CSV fallback file not found: ${csvFilePath}`);
    }
    
    this.logger.log(`Starting CSV ingestion from: ${csvFilePath}`);
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
          try {
            if (row.url) {
              this.logger.log(`Processing URL from CSV: ${row.url}`);
              await this.processArticleUseCase.execute(row.url);
            }
          } catch (error) {
            this.logger.error(`Error processing CSV row: ${error.message}`);
          }
        })
        .on('end', () => {
          this.logger.log('CSV ingestion completed');
          this.isRunning = true;
          resolve();
        })
        .on('error', (error) => {
          this.logger.error(`Error during CSV ingestion: ${error.message}`);
          reject(error);
        });
    });
  }

  async stopIngestion(): Promise<Maybe<Error>> {
    if (!this.isRunning) {
      return none();
    }
    
    try {
      await this.consumer.disconnect();
      this.isRunning = false;
      this.logger.log('Data ingestion stopped');
      return none();
    } catch (error) {
      this.logger.error(`Error stopping data ingestion: ${error.message}`);
      return just(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async onModuleDestroy() {
    await this.stopIngestion();
  }
} 