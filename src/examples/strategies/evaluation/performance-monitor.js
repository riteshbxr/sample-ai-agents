/**
 * Performance Monitor
 * Tracks performance metrics for AI API calls
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      averageLatency: 0,
      averageTokens: 0,
      errorRate: 0,
      successRate: 0,
    };
    this.latencies = [];
    this.errors = 0;
  }

  recordRequest(latency, tokens, success) {
    this.metrics.totalRequests++;
    this.latencies.push(latency);

    if (success) {
      this.metrics.averageTokens =
        (this.metrics.averageTokens * (this.metrics.totalRequests - 1) + tokens) /
        this.metrics.totalRequests;
    } else {
      this.errors++;
    }

    this.metrics.averageLatency =
      this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length;

    this.metrics.errorRate = ((this.errors / this.metrics.totalRequests) * 100).toFixed(2);
    this.metrics.successRate = (
      ((this.metrics.totalRequests - this.errors) / this.metrics.totalRequests) *
      100
    ).toFixed(2);
  }

  getMetrics() {
    return this.metrics;
  }
}
