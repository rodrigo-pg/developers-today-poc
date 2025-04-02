import { Injectable, Logger, Inject } from '@nestjs/common';
import { StartIngestionPort } from '../ports/start-ingestion.port';
import { DataIngestion } from '../../domain/services/data-ingestion.interface';
import { Maybe, just, none } from '@sweet-monads/maybe';

@Injectable()
export class StartIngestionUseCase implements StartIngestionPort {
  private readonly logger = new Logger(StartIngestionUseCase.name);

  constructor(
    @Inject('DataIngestion')
    private readonly dataIngestion: DataIngestion
  ) {}

  async execute(): Promise<Maybe<Error>> {
    try {
      const result = await this.dataIngestion.startIngestion();
      
      if (result.isJust()) {
        return result;
      }
      
      this.logger.log('Data ingestion started successfully');
      return none();
    } catch (error) {
      this.logger.error(`Failed to start data ingestion: ${error.message}`);
      return just(error instanceof Error ? error : new Error(String(error)));
    }
  }
} 