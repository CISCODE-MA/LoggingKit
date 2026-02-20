/**
 * Unit tests for log sampling functionality.
 */

import { shouldSampleLog, createSampler, SamplingStats } from "../src/core/sampling";

describe("Sampling", () => {
  describe("shouldSampleLog()", () => {
    test("always logs when sampling disabled", () => {
      const config = { samplingEnabled: false, samplingRate: 0.1 };

      expect(shouldSampleLog("debug", "test", config).shouldLog).toBe(true);
      expect(shouldSampleLog("silly", "test", config).shouldLog).toBe(true);
      expect(shouldSampleLog("verbose", "test", config).shouldLog).toBe(true);
    });

    test("always logs error level regardless of sampling", () => {
      const config = { samplingEnabled: true, samplingRate: 0.0 };

      expect(shouldSampleLog("error", "test", config).shouldLog).toBe(true);
      expect(shouldSampleLog("error", "test", config).wasSampled).toBe(false);
    });

    test("always logs warn level regardless of sampling", () => {
      const config = { samplingEnabled: true, samplingRate: 0.0 };

      expect(shouldSampleLog("warn", "test", config).shouldLog).toBe(true);
    });

    test("always logs info level regardless of sampling", () => {
      const config = { samplingEnabled: true, samplingRate: 0.0 };

      expect(shouldSampleLog("info", "test", config).shouldLog).toBe(true);
    });

    test("always logs http level regardless of sampling", () => {
      const config = { samplingEnabled: true, samplingRate: 0.0 };

      expect(shouldSampleLog("http", "test", config).shouldLog).toBe(true);
    });

    test("samples debug level when enabled", () => {
      const config = { samplingEnabled: true, samplingRate: 0.5 };
      const decision = shouldSampleLog("debug", "test", config);

      expect(decision.wasSampled).toBe(true);
      expect(decision.rate).toBe(0.5);
    });

    test("samples verbose level when enabled", () => {
      const config = { samplingEnabled: true, samplingRate: 0.5 };
      const decision = shouldSampleLog("verbose", "test", config);

      expect(decision.wasSampled).toBe(true);
    });

    test("samples silly level when enabled", () => {
      const config = { samplingEnabled: true, samplingRate: 0.5 };
      const decision = shouldSampleLog("silly", "test", config);

      expect(decision.wasSampled).toBe(true);
    });

    test("deterministic sampling - same message gives same result", () => {
      const config = { samplingEnabled: true, samplingRate: 0.5 };
      const message = "consistent-test-message";

      const results = new Set<boolean>();
      for (let i = 0; i < 10; i++) {
        results.add(shouldSampleLog("debug", message, config).shouldLog);
      }

      // Should always be the same result
      expect(results.size).toBe(1);
    });

    test("different messages may have different sampling decisions", () => {
      const config = { samplingEnabled: true, samplingRate: 0.5 };

      // With many different messages, we should see some variation
      const decisions = [];
      for (let i = 0; i < 100; i++) {
        decisions.push(shouldSampleLog("debug", `message-${i}`, config).shouldLog);
      }

      const logged = decisions.filter(Boolean).length;
      // With 50% rate and 100 messages, expect roughly 30-70 to be logged
      expect(logged).toBeGreaterThan(20);
      expect(logged).toBeLessThan(80);
    });

    test("rate of 0 drops all sampled logs", () => {
      const config = { samplingEnabled: true, samplingRate: 0.0 };

      // Test many messages
      const logged = [];
      for (let i = 0; i < 100; i++) {
        logged.push(shouldSampleLog("debug", `msg-${i}`, config).shouldLog);
      }

      // All should be dropped
      expect(logged.every((x) => !x)).toBe(true);
    });

    test("rate of 1 logs all sampled logs", () => {
      const config = { samplingEnabled: true, samplingRate: 1.0 };

      // Test many messages
      const logged = [];
      for (let i = 0; i < 100; i++) {
        logged.push(shouldSampleLog("debug", `msg-${i}`, config).shouldLog);
      }

      // All should be logged
      expect(logged.every((x) => x)).toBe(true);
    });

    test("clamps rate to 0-1 range", () => {
      const configHigh = { samplingEnabled: true, samplingRate: 1.5 };
      const configLow = { samplingEnabled: true, samplingRate: -0.5 };

      // Rate > 1 should be treated as 1
      expect(shouldSampleLog("debug", "test", configHigh).rate).toBe(1.0);

      // Rate < 0 should be treated as 0
      expect(shouldSampleLog("debug", "test", configLow).rate).toBe(0.0);
    });
  });

  describe("createSampler()", () => {
    test("returns always-true function when disabled", () => {
      const sampler = createSampler({ samplingEnabled: false, samplingRate: 0.0 });

      expect(sampler("debug", "test")).toBe(true);
      expect(sampler("silly", "test")).toBe(true);
    });

    test("returns sampling function when enabled", () => {
      const sampler = createSampler({ samplingEnabled: true, samplingRate: 0.5 });

      // Should return boolean
      expect(typeof sampler("debug", "test")).toBe("boolean");
    });

    test("sampler always allows non-sampled levels", () => {
      const sampler = createSampler({ samplingEnabled: true, samplingRate: 0.0 });

      expect(sampler("error", "test")).toBe(true);
      expect(sampler("warn", "test")).toBe(true);
      expect(sampler("info", "test")).toBe(true);
    });
  });

  describe("SamplingStats", () => {
    test("starts with zero counters", () => {
      const stats = new SamplingStats();

      expect(stats.total).toBe(0);
      expect(stats.sampled).toBe(0);
      expect(stats.dropped).toBe(0);
      expect(stats.dropRate).toBe(0);
    });

    test("records total logs", () => {
      const stats = new SamplingStats();

      stats.record({ shouldLog: true, wasSampled: false, rate: 1.0 });
      stats.record({ shouldLog: true, wasSampled: false, rate: 1.0 });

      expect(stats.total).toBe(2);
    });

    test("records sampled logs", () => {
      const stats = new SamplingStats();

      stats.record({ shouldLog: true, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: false, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: true, wasSampled: false, rate: 1.0 });

      expect(stats.sampled).toBe(2);
    });

    test("records dropped logs", () => {
      const stats = new SamplingStats();

      stats.record({ shouldLog: false, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: true, wasSampled: true, rate: 0.5 });

      expect(stats.dropped).toBe(1);
    });

    test("calculates drop rate correctly", () => {
      const stats = new SamplingStats();

      // 2 sampled, 1 dropped = 50% drop rate
      stats.record({ shouldLog: false, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: true, wasSampled: true, rate: 0.5 });

      expect(stats.dropRate).toBe(0.5);
    });

    test("toJSON returns stats object", () => {
      const stats = new SamplingStats();

      stats.record({ shouldLog: true, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: false, wasSampled: true, rate: 0.5 });

      const json = stats.toJSON();
      expect(json).toEqual({
        total: 2,
        sampled: 2,
        dropped: 1,
        dropRate: 0.5,
      });
    });

    test("reset clears all counters", () => {
      const stats = new SamplingStats();

      stats.record({ shouldLog: true, wasSampled: true, rate: 0.5 });
      stats.record({ shouldLog: false, wasSampled: true, rate: 0.5 });
      stats.reset();

      expect(stats.total).toBe(0);
      expect(stats.sampled).toBe(0);
      expect(stats.dropped).toBe(0);
    });
  });
});
