// ── Queue names ───────────────────────────────────────────────────────────────
export const CALL_ANALYSIS_QUEUE = 'call-analysis'
export const CALL_ANALYSIS_DLQ   = 'call-analysis-dlq'

// ── Job names ─────────────────────────────────────────────────────────────────
export const ANALYZE_CALL_JOB = 'analyze-call'

// ── Backoff delays in milliseconds (exponential: 1m 2m 5m 10m 30m) ───────────
export const BACKOFF_DELAYS_MS = [
  1  * 60 * 1_000,   // 1 min
  2  * 60 * 1_000,   // 2 min
  5  * 60 * 1_000,   // 5 min
  10 * 60 * 1_000,   // 10 min
  30 * 60 * 1_000,   // 30 min
]

// ── Error classification ──────────────────────────────────────────────────────

/** Signals from Gemini / upstream that indicate overload → always retry */
export const RETRYABLE_PATTERNS = [
  'timeout',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'model overloaded',
  'deadline exceeded',
  'resource exhausted',
  'service unavailable',
]

export const RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504]

/** Errors that must NOT be retried */
export const NON_RETRYABLE_PATTERNS = [
  'Campaña no encontrada',
  'datos inválidos',
  'audio no accesible',
]

export const NON_RETRYABLE_HTTP_CODES = [400, 401, 403, 404, 422]