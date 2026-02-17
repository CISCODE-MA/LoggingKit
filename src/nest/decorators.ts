/**
 * InjectLogger decorator for injecting the logger into services.
 */

import { Inject } from "@nestjs/common";

import { LOGGER } from "./constants";

/**
 * Decorator to inject the Logger instance.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(@InjectLogger() private readonly logger: Logger) {}
 * }
 * ```
 */
export const InjectLogger = (): ParameterDecorator => Inject(LOGGER);
