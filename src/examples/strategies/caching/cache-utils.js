/**
 * Cache Utilities
 * Helper functions for cache management
 */

/**
 * Calculate cost savings from cache
 */
export function calculateSavings(cacheStats, avgCostPerRequest = 0.01) {
  const savedRequests = cacheStats.hits;
  const totalCost = (cacheStats.hits + cacheStats.misses) * avgCostPerRequest;
  const savedCost = savedRequests * avgCostPerRequest;
  const savingsPercent = ((savedCost / totalCost) * 100).toFixed(2);

  return {
    savedRequests,
    savedCost: `$${savedCost.toFixed(4)}`,
    totalCost: `$${totalCost.toFixed(4)}`,
    savingsPercent: `${savingsPercent}%`,
  };
}
