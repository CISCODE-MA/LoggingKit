# @ciscode/logging-kit

Universal logging library for NestJS with configurable transports and automatic request correlation.

## Features

- **Multiple Transports**: Console, File (with daily rotation), HTTP (Dynatrace, etc.)
- **Request Correlation**: Automatic correlation ID tracking via `X-Request-Id` header
- **Environment-based Config**: Configure via environment variables with per-environment overrides
- **NestJS Integration**: DynamicModule with injectable LoggingService
- **TypeScript**: Full type safety with exported interfaces

## Installation

```bash
npm install @ciscode/logging-kit
```

## Quick Start

### Basic Setup

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { LoggingModule } from "@ciscode/logging-kit";

@Module({
  imports: [
    LoggingModule.register({
      defaultMeta: { service: "my-app" },
    }),
  ],
})
export class AppModule {}
```

### Using the Logger

```typescript
// my.service.ts
import { Injectable } from "@nestjs/common";
import { LoggingService } from "@ciscode/logging-kit";

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggingService) {}

  doSomething() {
    this.logger.info("Processing request", { userId: 123 });
    this.logger.error("Something went wrong", { error: "details" });
  }
}
```

### With Correlation ID Interceptor

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { CorrelationIdInterceptor } from "@ciscode/logging-kit";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply globally for automatic request correlation
  app.useGlobalInterceptors(app.get(CorrelationIdInterceptor));

  await app.listen(3000);
}
bootstrap();
```

### Async Configuration

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggingModule } from "@ciscode/logging-kit";

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggingModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          level: configService.get("LOG_LEVEL", "info"),
          http: configService.get("LOG_HTTP") === "true",
          httpUrl: configService.get("DYNATRACE_URL"),
          httpApiKey: configService.get("DYNATRACE_API_KEY"),
        },
        defaultMeta: { service: configService.get("APP_NAME") },
      }),
    }),
  ],
})
export class AppModule {}
```

## Configuration

### Environment Variables

| Variable            | Default          | Description                                               |
| ------------------- | ---------------- | --------------------------------------------------------- |
| `LOG_LEVEL`         | `info`           | Log level: error, warn, info, http, verbose, debug, silly |
| `LOG_CONSOLE`       | `true`           | Enable console output                                     |
| `LOG_FILE`          | `false`          | Enable file logging                                       |
| `LOG_FILE_PATH`     | `./logs/app.log` | Log file path                                             |
| `LOG_FILE_MAXSIZE`  | `10485760`       | Max file size in bytes (10MB)                             |
| `LOG_FILE_MAXFILES` | `5`              | Max number of rotated files                               |
| `LOG_HTTP`          | `false`          | Enable HTTP transport                                     |
| `LOG_HTTP_URL`      | ``               | HTTP endpoint URL (e.g., Dynatrace)                       |
| `LOG_HTTP_API_KEY`  | ``               | API key for HTTP transport                                |

### Per-Environment Overrides

Append `_DEVELOPMENT`, `_PRODUCTION`, etc. to any variable:

```env
LOG_LEVEL=info
LOG_LEVEL_DEVELOPMENT=debug
LOG_LEVEL_PRODUCTION=warn
```

## Dynatrace Integration

```env
LOG_HTTP=true
LOG_HTTP_URL=https://your-instance.live.dynatrace.com/api/v2/logs/ingest
LOG_HTTP_API_KEY=your-api-token
```

## API Reference

### LoggingModule

- `LoggingModule.register(options?)` - Sync registration
- `LoggingModule.registerAsync(options)` - Async registration with factory

### LoggingService

Implements the `Logger` interface:

```typescript
interface Logger {
  error(message: string, meta?: LoggerMetadata): void;
  warn(message: string, meta?: LoggerMetadata): void;
  info(message: string, meta?: LoggerMetadata): void;
  http(message: string, meta?: LoggerMetadata): void;
  verbose(message: string, meta?: LoggerMetadata): void;
  debug(message: string, meta?: LoggerMetadata): void;
  silly(message: string, meta?: LoggerMetadata): void;
  child(meta: LoggerMetadata): Logger;
}
```

### Decorators

- `@InjectLogger()` - Inject the Logger instance directly

### Interceptors

- `CorrelationIdInterceptor` - Attaches correlation ID to requests and logs

## Architecture

```
src/
├── core/               # Framework-free types and utilities
│   ├── types.ts        # Logger interface, config types
│   ├── config.ts       # Environment-based configuration
│   └── correlation.ts  # Correlation ID utilities
├── infra/              # Winston implementation (internal)
│   ├── transports.ts   # Transport factory
│   └── logger.factory.ts  # Logger creation
└── nest/               # NestJS integration
    ├── module.ts       # DynamicModule
    ├── service.ts      # Injectable LoggingService
    ├── interceptor.ts  # CorrelationIdInterceptor
    └── decorators.ts   # @InjectLogger()
```

## Scripts

- `npm run build` – Build to `dist/`
- `npm test` – Run tests
- `npm run typecheck` – TypeScript type checking
- `npm run lint` – ESLint
- `npm run format` / `npm run format:write` – Prettier

## License

MIT
