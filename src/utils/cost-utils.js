/**
 * Cost Utilities
 * Common functions for calculating API costs
 */

/**
 * Default pricing per 1K tokens (as of 2024, adjust as needed)
 */
const DEFAULT_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
};

/**
 * Normalize model name for pricing lookup
 * @param {string} model - Model name
 * @returns {string} Normalized model key
 */
function normalizeModelName(model) {
  if (!model) return 'gpt-3.5-turbo';
  return model.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Get pricing for a model
 * @param {string} model - Model name
 * @returns {Object} Pricing object with input and output rates per 1K tokens
 */
export function getPricing(model) {
  const normalized = normalizeModelName(model);

  // Try exact match first
  if (DEFAULT_PRICING[normalized]) {
    return DEFAULT_PRICING[normalized];
  }

  // Try partial matches
  for (const [key, pricing] of Object.entries(DEFAULT_PRICING)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return pricing;
    }
  }

  // Default to gpt-3.5-turbo pricing
  return DEFAULT_PRICING['gpt-3.5-turbo'];
}

/**
 * Calculate cost for an API call
 * @param {number} promptTokens - Number of prompt tokens
 * @param {number} completionTokens - Number of completion tokens
 * @param {string} model - Model name
 * @returns {Object} Cost calculation result
 */
export function calculateCost(promptTokens, completionTokens, model) {
  const pricing = getPricing(model);

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    model: normalizeModelName(model),
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: totalCost.toFixed(6),
    inputCostUSD: `$${inputCost.toFixed(6)}`,
    outputCostUSD: `$${outputCost.toFixed(6)}`,
    totalCostUSD: `$${totalCost.toFixed(6)}`,
  };
}

/**
 * Calculate cost from API response
 * @param {Object} response - API response with usage information
 * @param {string} model - Model name
 * @returns {Object} Cost calculation result
 */
export function calculateCostFromResponse(response, model) {
  const usage = response?.usage || response;
  const promptTokens = usage.prompt_tokens || usage.input_tokens || 0;
  const completionTokens = usage.completion_tokens || usage.output_tokens || 0;

  return calculateCost(promptTokens, completionTokens, model);
}

/**
 * Calculate total cost for multiple API calls
 * @param {Array<Object>} calls - Array of call objects with {promptTokens, completionTokens, model}
 * @returns {Object} Aggregated cost information
 */
export function calculateTotalCost(calls) {
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  const modelBreakdown = {};

  for (const call of calls) {
    const cost = calculateCost(
      call.promptTokens || 0,
      call.completionTokens || 0,
      call.model || 'gpt-3.5-turbo'
    );

    totalInputCost += parseFloat(cost.inputCost);
    totalOutputCost += parseFloat(cost.outputCost);
    totalPromptTokens += cost.promptTokens;
    totalCompletionTokens += cost.completionTokens;

    const modelKey = cost.model;
    if (!modelBreakdown[modelKey]) {
      modelBreakdown[modelKey] = {
        calls: 0,
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
      };
    }

    modelBreakdown[modelKey].calls++;
    modelBreakdown[modelKey].promptTokens += cost.promptTokens;
    modelBreakdown[modelKey].completionTokens += cost.completionTokens;
    modelBreakdown[modelKey].cost += parseFloat(cost.totalCost);
  }

  return {
    totalCalls: calls.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    totalInputCost: totalInputCost.toFixed(6),
    totalOutputCost: totalOutputCost.toFixed(6),
    totalCost: (totalInputCost + totalOutputCost).toFixed(6),
    totalCostUSD: `$${(totalInputCost + totalOutputCost).toFixed(6)}`,
    modelBreakdown,
  };
}

/**
 * Estimate monthly cost based on usage patterns
 * @param {Object} dailyUsage - Daily usage stats
 * @param {number} daysPerMonth - Days in month (default 30)
 * @returns {Object} Monthly cost estimate
 */
export function estimateMonthlyCost(dailyUsage, daysPerMonth = 30) {
  const { averageCallsPerDay = 0, averageTokensPerCall = 0, model = 'gpt-3.5-turbo' } = dailyUsage;

  const monthlyCalls = averageCallsPerDay * daysPerMonth;
  const monthlyTokens = monthlyCalls * averageTokensPerCall;
  const avgPromptRatio = 0.7; // Assume 70% prompt, 30% completion
  const promptTokens = Math.floor(monthlyTokens * avgPromptRatio);
  const completionTokens = Math.floor(monthlyTokens * (1 - avgPromptRatio));

  const cost = calculateCost(promptTokens, completionTokens, model);

  return {
    ...cost,
    monthlyCalls,
    monthlyTokens,
    daysPerMonth,
  };
}
