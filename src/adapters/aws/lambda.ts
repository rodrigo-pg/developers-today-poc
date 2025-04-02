import "reflect-metadata";
import { configure } from '@codegenie/serverless-express';
import { INestApplication } from "@nestjs/common";
import { NestFactory } from '@nestjs/core';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from "src/app.module";

let appCache: INestApplication<any>;
let server: Handler;

async function bootstrap() {
    if (appCache) return appCache
    const app = await NestFactory.create(AppModule, {
      logger: ["log", "error", "warn"],
      rawBody: true
    });

    await app.init();
    appCache = app;
    return app;
}

async function configureAppHandler() {
    const app = await bootstrap()
    const expressHandler = app.getHttpAdapter().getInstance();
    return configure({ app: expressHandler });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback | undefined
) => {
  server = server ?? (await configureAppHandler());
  return server(event, context, callback);
}