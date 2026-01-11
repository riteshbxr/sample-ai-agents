/**
 * Error Classifier
 * Classifies errors and suggests appropriate actions
 */
export function classifyError(error) {
  if (error.status === 401) {
    return { type: 'AUTH_ERROR', action: 'Check API key' };
  }
  if (error.status === 429) {
    return { type: 'RATE_LIMIT', action: 'Retry with backoff' };
  }
  if (error.status >= 500) {
    return { type: 'SERVER_ERROR', action: 'Retry later' };
  }
  if (error.status === 400) {
    return { type: 'BAD_REQUEST', action: 'Fix request parameters' };
  }
  return { type: 'UNKNOWN', action: 'Log and investigate' };
}
