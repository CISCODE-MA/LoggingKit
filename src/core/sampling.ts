/**
 * Log sampling utilities.
 * Reduces log volume by sampling verbose/debug logs in production.
 */

import type { LoggingConfig, LogLevel } from "./types";

/** Log levels that are subject to sampling (high-volume levels) */
const SAMPLED_LEVELS: LogLevel[] = ["debug", "verbose", "silly"];

/** Log levels that are never sampled (always logged) */
const ALWAYS_LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "http"];

export interface SamplingDecision {
  /** Whether this log should be emitted */
  shouldLog: boolean;
  /** Whether sampling was applied */
  wasSampled: boolean;
  /** The sampling rate used (0-1) */
  rate: number;
}

/**
 * Deterministic sampler using message hash.
 * This ensures the same message always gets the same sampling decision,
 * preventing intermittent log appearance.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Determines if a log should be sampled out.
 */
export function shouldSampleLog(
  level: LogLevel,
  message: string,
  config: Pick<LoggingConfig, "samplingEnabled" | "samplingRate">,
): SamplingDecision {
  // If sampling is disabled, always log
  if (!config.samplingEnabled) {
    return { shouldLog: true, wasSampled: false, rate: 1.0 };
  }

  // Always log high-priority levels
  if (ALWAYS_LOG_LEVELS.includes(level)) {
    return { shouldLog: true, wasSampled: false, rate: 1.0 };
  }

  // Apply sampling to verbose levels
  if (SAMPLED_LEVELS.includes(level)) {
    const rate = Math.max(0, Math.min(1, config.samplingRate));

    // Use deterministic sampling based on message hash
    const hash = hashString(message);
    const threshold = Math.floor(rate * 1000);
    const shouldLog = hash % 1000 < threshold;

    return { shouldLog, wasSampled: true, rate };
  }

  // Default: log everything
  return { shouldLog: true, wasSampled: false, rate: 1.0 };
}

/**
 * Creates a sampling filter based on configuration.
 */
export function createSampler(
  config: Pick<LoggingConfig, "samplingEnabled" | "samplingRate">,
): (level: LogLevel, message: string) => boolean {
  if (!config.samplingEnabled) {
    return () => true;
  }

  return (level: LogLevel, message: string) => {
    const decision = shouldSampleLog(level, message, config);
    return decision.shouldLog;
  };
}

/**
 * Sampling statistics tracker for observability.
 */
export class SamplingStats {
  private _total = 0;
  private _sampled = 0;
  private _dropped = 0;

  record(decision: SamplingDecision): void {
    this._total++;
    if (decision.wasSampled) {
      this._sampled++;
      if (!decision.shouldLog) {
        this._dropped++;
      }
    }
  }

  get total(): number {
    return this._total;
  }

  get sampled(): number {
    return this._sampled;
  }

  get dropped(): number {
    return this._dropped;
  }

  get dropRate(): number {
    return this._sampled > 0 ? this._dropped / this._sampled : 0;
  }

  toJSON(): Record<string, number> {
    return {
      total: this._total,
      sampled: this._sampled,
      dropped: this._dropped,
      dropRate: this.dropRate,
    };
  }

  reset(): void {
    this._total = 0;
    this._sampled = 0;
    this._dropped = 0;
  }
}
