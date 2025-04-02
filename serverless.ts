import type { AWS } from '@serverless/typescript'

const serverlessConfiguration: AWS = {
  service: 'developers-today-poc',
  app: 'developers-today-poc',
  useDotenv: true,
  frameworkVersion: '3',
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-dotenv-plugin'
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    timeout: 100
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      target: 'node18',
      platform: 'node',
      exclude: ['aws-sdk'],
      external: [
        "@nestjs/websockets/socket-module",
        "@nestjs/microservices/microservices-module",
        "@nestjs/microservices",
        "class-transformer",
        "class-validator",
        "@nestjs/swagger/dist/services/schema-object-factory"
      ],
      concurrency: 20,
      define: { 'require.resolve': undefined }
    },
    dotenv: {
      path: "./.env"
    }
  },
  functions: {
    main: {
      handler: './src/adapters/aws/lambda.handler',
      events: [
        {
          http: {
            method: 'ANY',
            path: '/'
          }
        },
        {
          http: {
            method: 'ANY',
            path: '/{proxy+}'
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration