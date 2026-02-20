/**
 * LoggingModule - NestJS module for logging.
 */

import { Module, Global } from "@nestjs/common";
import type { DynamicModule, Provider } from "@nestjs/common";

import { buildConfig } from "../core/config";
import type { LoggingModuleOptions } from "../core/types";
import { createLogger } from "../infra/logger.factory";

import { LOGGER, LOGGING_CONFIG, LOGGING_MODULE_OPTIONS } from "./constants";
import { CorrelationIdInterceptor } from "./interceptor";
import { LoggingService } from "./service";

@Global()
@Module({})
export class LoggingModule {
  /**
   * Register the LoggingModule with optional configuration.
   *
   * @example
   * ```typescript
   * // Basic usage (reads from env vars)
   * LoggingModule.register()
   *
   * // With custom config
   * LoggingModule.register({
   *   config: { level: 'debug', console: true },
   *   defaultMeta: { service: 'my-app' },
   *   isGlobal: true,
   * })
   * ```
   */
  static register(options: LoggingModuleOptions = {}): DynamicModule {
    const { config, defaultMeta, isGlobal = true } = options;

    // Build full config from env vars + overrides
    const fullConfig = buildConfig(config);

    const configProvider: Provider = {
      provide: LOGGING_CONFIG,
      useValue: fullConfig,
    };

    const loggerProvider: Provider = {
      provide: LOGGER,
      useFactory: () => createLogger(config, defaultMeta),
    };

    const optionsProvider: Provider = {
      provide: LOGGING_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: LoggingModule,
      global: isGlobal,
      providers: [
        optionsProvider,
        configProvider,
        loggerProvider,
        LoggingService,
        CorrelationIdInterceptor,
      ],
      exports: [LOGGER, LOGGING_CONFIG, LoggingService, CorrelationIdInterceptor],
    };
  }

  /**
   * Register the LoggingModule asynchronously with factory.
   *
   * @example
   * ```typescript
   * LoggingModule.registerAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (configService: ConfigService) => ({
   *     config: {
   *       level: configService.get('LOG_LEVEL'),
   *       httpUrl: configService.get('DYNATRACE_URL'),
   *       httpApiKey: configService.get('DYNATRACE_API_KEY'),
   *     },
   *     defaultMeta: { service: configService.get('APP_NAME') },
   *   }),
   * })
   * ```
   */
  static registerAsync(asyncOptions: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => LoggingModuleOptions | Promise<LoggingModuleOptions>;
    isGlobal?: boolean;
  }): DynamicModule {
    const { imports = [], inject = [], useFactory, isGlobal = true } = asyncOptions;

    const configProvider: Provider = {
      provide: LOGGING_CONFIG,
      inject: [LOGGING_MODULE_OPTIONS],
      useFactory: (options: LoggingModuleOptions) => {
        return buildConfig(options.config);
      },
    };

    const loggerProvider: Provider = {
      provide: LOGGER,
      inject: [LOGGING_MODULE_OPTIONS],
      useFactory: (options: LoggingModuleOptions) => {
        return createLogger(options.config, options.defaultMeta);
      },
    };

    const optionsProvider: Provider = {
      provide: LOGGING_MODULE_OPTIONS,
      inject,
      useFactory,
    };

    return {
      module: LoggingModule,
      global: isGlobal,
      imports,
      providers: [
        optionsProvider,
        configProvider,
        loggerProvider,
        LoggingService,
        CorrelationIdInterceptor,
      ],
      exports: [LOGGER, LOGGING_CONFIG, LoggingService, CorrelationIdInterceptor],
    };
  }
}
