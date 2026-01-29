import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CircuitBreaker } from '../../src/examples/strategies/error-handling/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second timeout
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultBreaker = new CircuitBreaker();
      assert.strictEqual(defaultBreaker.threshold, 5);
      assert.strictEqual(defaultBreaker.timeout, 60000);
      assert.strictEqual(defaultBreaker.state, 'CLOSED');
      assert.strictEqual(defaultBreaker.failureCount, 0);
    });

    it('should accept custom threshold and timeout', () => {
      assert.strictEqual(breaker.threshold, 3);
      assert.strictEqual(breaker.timeout, 1000);
    });
  });

  describe('execute - success cases', () => {
    it('should execute function successfully when circuit is closed', async () => {
      const result = await breaker.execute(async () => 'success');
      assert.strictEqual(result, 'success');
      assert.strictEqual(breaker.state, 'CLOSED');
      assert.strictEqual(breaker.failureCount, 0);
    });

    it('should reset failure count on success', async () => {
      // Simulate 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }
      assert.strictEqual(breaker.failureCount, 2);

      // Success should reset
      await breaker.execute(async () => 'success');
      assert.strictEqual(breaker.failureCount, 0);
    });
  });

  describe('execute - failure cases', () => {
    it('should increment failure count on error', async () => {
      try {
        await breaker.execute(async () => {
          throw new Error('test error');
        });
      } catch {
        // Expected
      }
      assert.strictEqual(breaker.failureCount, 1);
      assert.strictEqual(breaker.state, 'CLOSED');
    });

    it('should open circuit after threshold failures', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }
      assert.strictEqual(breaker.failureCount, 3);
      assert.strictEqual(breaker.state, 'OPEN');
    });

    it('should reject requests when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      // Next request should be rejected immediately
      await assert.rejects(async () => breaker.execute(async () => 'should not run'), {
        message: 'Circuit breaker is OPEN. Service unavailable.',
      });
    });
  });

  describe('half-open state', () => {
    it('should transition to half-open after timeout', async () => {
      // Use a very short timeout for testing
      const shortBreaker = new CircuitBreaker(1, 50);

      // Open the circuit
      try {
        await shortBreaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
      assert.strictEqual(shortBreaker.state, 'OPEN');

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Next execution should transition to half-open
      await shortBreaker.execute(async () => 'success');
      assert.strictEqual(shortBreaker.state, 'CLOSED');
    });

    it('should close circuit on success in half-open state', async () => {
      const shortBreaker = new CircuitBreaker(1, 50);

      // Open the circuit
      try {
        await shortBreaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      // Wait and succeed
      await new Promise((resolve) => setTimeout(resolve, 100));
      await shortBreaker.execute(async () => 'success');

      assert.strictEqual(shortBreaker.state, 'CLOSED');
      assert.strictEqual(shortBreaker.failureCount, 0);
    });

    it('should re-open circuit on failure in half-open state', async () => {
      const shortBreaker = new CircuitBreaker(1, 50);

      // Open the circuit
      try {
        await shortBreaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      // Wait for timeout and fail again
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        await shortBreaker.execute(async () => {
          throw new Error('fail again');
        });
      } catch {
        // Expected
      }

      assert.strictEqual(shortBreaker.state, 'OPEN');
    });
  });

  describe('onSuccess', () => {
    it('should reset failure count and close circuit', () => {
      breaker.failureCount = 5;
      breaker.state = 'HALF_OPEN';

      breaker.onSuccess();

      assert.strictEqual(breaker.failureCount, 0);
      assert.strictEqual(breaker.state, 'CLOSED');
    });
  });

  describe('onFailure', () => {
    it('should increment failure count', () => {
      breaker.onFailure();
      assert.strictEqual(breaker.failureCount, 1);
    });

    it('should open circuit when threshold reached', () => {
      breaker.failureCount = 2;
      breaker.onFailure();

      assert.strictEqual(breaker.failureCount, 3);
      assert.strictEqual(breaker.state, 'OPEN');
      assert.ok(breaker.nextAttempt > Date.now());
    });
  });
});
