/**
 * Unit tests for CorrelationIdInterceptor behavior.
 */
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";

import { CORRELATION_ID_HEADER } from "../src/core/correlation";
import { createLogger } from "../src/infra/logger.factory";
import { CorrelationIdInterceptor } from "../src/nest/interceptor";
import type { LoggingService } from "../src/nest/service";

describe("CorrelationIdInterceptor - Behavior", () => {
  let interceptor: CorrelationIdInterceptor;
  let mockLoggingService: LoggingService;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: {
    headers: Record<string, string | undefined>;
    method: string;
    url: string;
    logger?: any;
  };
  let mockResponse: {
    setHeader: jest.Mock;
  };

  beforeEach(() => {
    // Create a real logger (with console disabled)
    const logger = createLogger({ console: false });

    // Create a mock LoggingService
    mockLoggingService = {
      withCorrelationId: jest.fn().mockImplementation((correlationId: string) => {
        return logger.child({ correlationId });
      }),
    } as unknown as LoggingService;

    interceptor = new CorrelationIdInterceptor(mockLoggingService);

    // Setup mock request
    mockRequest = {
      headers: {},
      method: "GET",
      url: "/api/test",
    };

    // Setup mock response
    mockResponse = {
      setHeader: jest.fn(),
    };

    // Setup mock ExecutionContext
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    // Setup mock CallHandler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: "test" })),
    };
  });

  test("generates correlationId when not present in headers", async () => {
    mockRequest.headers = {};

    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    // Should have generated a correlationId in the header
    expect(mockRequest.headers[CORRELATION_ID_HEADER]).toBeDefined();
    expect(mockRequest.headers[CORRELATION_ID_HEADER]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test("uses existing correlationId from headers", async () => {
    const existingCorrelationId = "existing-correlation-123";
    mockRequest.headers["x-request-id"] = existingCorrelationId;

    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(mockRequest.headers[CORRELATION_ID_HEADER]).toBe(existingCorrelationId);
  });

  test("sets correlationId in response header", async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(mockResponse.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, expect.any(String));
  });

  test("attaches logger to request object", async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(mockRequest.logger).toBeDefined();
    expect(mockRequest.logger).toHaveProperty("info");
    expect(mockRequest.logger).toHaveProperty("error");
  });

  test("calls loggingService.withCorrelationId", async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(mockLoggingService.withCorrelationId).toHaveBeenCalledWith(expect.any(String));
  });

  test("passes through the response from next handler", async () => {
    const expectedResponse = { data: "test-response" };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(expectedResponse));

    const result = await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(result).toEqual(expectedResponse);
  });

  test("calls next.handle()", async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  test("handles requests without setHeader method on response", async () => {
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}), // No setHeader
      }),
    } as unknown as ExecutionContext;

    // Should not throw
    await expect(
      lastValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
    ).resolves.not.toThrow();
  });

  test("logs request start and completion", async () => {
    const infoSpy = jest.fn();
    mockLoggingService.withCorrelationId = jest.fn().mockReturnValue({
      info: infoSpy,
      error: jest.fn(),
      child: jest.fn(),
    });

    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    // Should have logged request start and completion
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Incoming request"),
      expect.objectContaining({
        method: "GET",
        url: "/api/test",
      }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Request completed"),
      expect.objectContaining({
        method: "GET",
        url: "/api/test",
        duration: expect.any(Number),
      }),
    );
  });

  test("logs request failure on error", async () => {
    const errorSpy = jest.fn();
    const infoSpy = jest.fn();
    mockLoggingService.withCorrelationId = jest.fn().mockReturnValue({
      info: infoSpy,
      error: errorSpy,
      child: jest.fn(),
    });

    const testError = new Error("Test error");
    mockCallHandler.handle = jest.fn().mockReturnValue(
      new (await import("rxjs")).Observable((subscriber) => {
        subscriber.error(testError);
      }),
    );

    await expect(
      lastValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
    ).rejects.toThrow("Test error");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Request failed"),
      expect.objectContaining({
        method: "GET",
        url: "/api/test",
        error: "Test error",
      }),
    );
  });
});
