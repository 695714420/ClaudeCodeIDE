/**
 * ErrorHandler — maps API errors and network errors to user-friendly messages,
 * and provides auto-retry for transient server errors (500/503).
 */

import { t } from '../i18n'
import type { Lang } from '../i18n'

export interface ErrorInfo {
  message: string
  suggestion: string
}

/**
 * Map an HTTP status code to a user-friendly error message and suggestion.
 */
export function mapApiError(statusCode: number, lang: Lang = 'en'): ErrorInfo {
  switch (statusCode) {
    case 401:
      return {
        message: t('error.invalidKey', lang),
        suggestion: t('error.invalidKeySuggestion', lang)
      }
    case 400:
      return {
        message: t('error.badRequest', lang),
        suggestion: t('error.badRequestSuggestion', lang)
      }
    case 429:
      return {
        message: t('error.rateLimit', lang),
        suggestion: t('error.rateLimitSuggestion', lang)
      }
    case 500:
    case 503:
      return {
        message: t('error.serverError', lang),
        suggestion: t('error.serverErrorSuggestion', lang)
      }
    default:
      return {
        message: t('error.generic', lang),
        suggestion: t('error.genericSuggestion', lang)
      }
  }
}

/**
 * Map a network/timeout error to a user-friendly error message and suggestion.
 */
export function mapNetworkError(error: Error, lang: Lang = 'en'): ErrorInfo {
  const msg = error.message.toLowerCase()

  if (msg.includes('timeout') || msg.includes('超时')) {
    return {
      message: t('error.timeout', lang),
      suggestion: t('error.timeoutSuggestion', lang)
    }
  }

  if (
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('net::') ||
    msg.includes('网络')
  ) {
    return {
      message: t('error.network', lang),
      suggestion: t('error.networkSuggestion', lang)
    }
  }

  if (msg.includes('密钥') || msg.includes('key') || msg.includes('not configured')) {
    return {
      message: t('error.keyNotConfigured', lang),
      suggestion: t('error.keyNotConfiguredSuggestion', lang)
    }
  }

  return {
    message: t('error.generic', lang),
    suggestion: t('error.genericSuggestion', lang)
  }
}

/**
 * Whether the given HTTP status code is a retryable server error.
 */
export function isRetryableError(statusCode: number): boolean {
  return statusCode === 500 || statusCode === 503
}

/**
 * Execute an async function with automatic retry for server errors (500/503).
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error

      const statusCode = getStatusCode(error)
      if (statusCode !== undefined && isRetryableError(statusCode) && attempt < maxRetries) {
        continue
      }

      throw error
    }
  }

  throw lastError
}

function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode: unknown }).statusCode
    if (typeof code === 'number') return code
  }
  return undefined
}
