# News RAG Application

A NestJS-based application that implements a Retrieval-Augmented Generation (RAG) system for news articles. The system extracts content from news articles, processes them, and provides intelligent responses to user queries by leveraging LLMs enhanced with relevant context.

## Live Demo

This application is deployed and available online via AWS Lambda:
[https://znmo2eshrg.execute-api.us-east-1.amazonaws.com/production/](https://znmo2eshrg.execute-api.us-east-1.amazonaws.com/production/)

> **Note**: Since the application is deployed as a Lambda function, the Kafka ingestion feature is not available through this endpoint. However, you can still add new articles by including their URLs directly in your query (e.g., "Summarize this article: https://example.com/article").

## Features

- Article content extraction from URLs
- Vector-based similarity search for relevant articles
- LLM-powered question answering with source citations
- Data ingestion via Kafka with CSV fallback
- Telemetry integration with Langfuse (optional)

## Architecture

This project follows **Clean Architecture** principles to maintain a codebase that is:
- Testable
- Maintainable
- Independent of frameworks, databases, and external agencies

### Project Structure

```
src/
├── news/
│   ├── domain/         # Enterprise business rules
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── services/
│   ├── application/    # Application business rules
│   │   ├── ports/
│   │   └── use-cases/
│   ├── adapters/       # Interface adapters
│   │   └── http/
│   └── infra/          # Frameworks & drivers
│       ├── repositories/
│       └── services/
└── main.ts             # Application entry point
```

### Design Decisions

1. **Clean Architecture**
   - The core business logic is isolated from external dependencies
   - Dependencies point inward, with inner layers having no knowledge of outer layers
   - This enables easy testing and swapping of implementations

2. **Ports & Adapters**
   - Use cases define ports (interfaces) that external adapters must implement
   - This allows for easy replacement of infrastructure components

3. **Dependency Injection**
   - NestJS's dependency injection is used to wire everything together
   - Implementation details are provided at runtime

4. **Functional Error Handling**
   - Uses `@sweet-monads/either` and `@sweet-monads/maybe` for expressive error handling
   - Avoids exception throwing in favor of typed returns

5. **Cost-Efficient Content Extraction**
   - Uses heuristic-based extraction with Cheerio (jQuery-like HTML parser) instead of LLMs
   - Applies common patterns and selectors to identify article content, publication dates, and titles
   - Significantly reduces operational costs by limiting LLM usage to only the query answering phase
   - Maintains extraction quality for most mainstream news websites and blogs

## Prerequisites

- Node.js (v16+)
- Docker and Docker Compose (for containerized deployment)
- Access to the following services:
  - OpenAI API
  - Pinecone (vector database)
  - Kafka (optional, for data ingestion)

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# Application
PORT=3000

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-pinecone-index-name

# Kafka (optional)
KAFKA_BROKER=your-kafka-broker
KAFKA_USERNAME=your-kafka-username
KAFKA_PASSWORD=your-kafka-password
KAFKA_TOPIC_NAME=your-kafka-topic
KAFKA_GROUP_ID_PREFIX=rag-news-

# Langfuse (optional)
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
LANGFUSE_SECRET_KEY=your-langfuse-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com

# Fallback CSV Path (used if Kafka is unavailable)
CSV_FALLBACK_PATH=./articles_dataset.csv
```

## Installation

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

### Docker Deployment

```bash
# Build the Docker image
$ docker build -t news-rag-app .

# Run the container
$ docker run -p 3000:3000 --env-file .env news-rag-app
```

### Using Docker Compose

```bash
# Start all services
$ docker-compose up -d

# Stop all services
$ docker-compose down
```

## API Endpoints

### Query News

```
POST /agent
```

Request body:
```json
{
  "query": "What are the latest developments in AI?"
}
```

Response:
```json
{
  "answer": "The latest developments in AI include...",
  "sources": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "date": "2023-05-15"
    }
  ]
}
```

You can also include URLs in your query to process specific articles:

```json
{
  "query": "Summarize this article: https://example.com/article"
}
```

## Data Ingestion

The application supports two methods of data ingestion:

1. **Kafka Streaming** - Articles are received from a Kafka topic
2. **CSV Fallback** - If Kafka is unavailable, the system will attempt to load articles from a CSV file

## Run tests

```bash
# e2e tests
$ pnpm run test:e2e
```
