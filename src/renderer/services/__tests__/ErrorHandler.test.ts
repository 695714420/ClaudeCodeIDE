import {
  mapApiError,
  mapNetworkError,
  isRetryableError,
  executeWithRetry,
  ErrorInfo
} from '../ErrorHandler'

describe('ErrorHandler', () => {
  // --- mapApiError ---

  describe('mapApiError (Req 5.5, 12.4)', () => {
    it('should map 401 to invalid key message', () => {
      const result = mapApiError(401)
      expect(result.message).toBe('Invalid API key, please check your key')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map 400 to parameter error message', () => {
      const result = mapApiError(400)
      expect(result.message).toBe('Invalid request parameters, please retry')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map 429 to rate limit message', () => {
      const result = mapApiError(429)
      expect(result.message).toBe('Too many requests, please wait and retry')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map 500 to service unavailable message', () => {
      const result = mapApiError(500)
      expect(result.message).toBe('Code IDE service temporarily unavailable')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map 503 to service unavailable message', () => {
      const result = mapApiError(503)
      expect(result.message).toBe('Code IDE service temporarily unavailable')
      expect(result.suggestion).toBeTruthy()
    })

    it('should return a generic message for unknown status codes', () => {
      const result = mapApiError(418)
      expect(result.message).toBeTruthy()
      expect(result.suggestion).toBeTruthy()
    })

    it('should never include raw HTTP status codes in messages', () => {
      const codes = [400, 401, 429, 500, 503, 404, 418, 502]
      for (const code of codes) {
        const result = mapApiError(code)
        expect(result.message).not.toMatch(/\b\d{3}\b/)
        expect(result.suggestion).not.toMatch(/\b\d{3}\b/)
      }
    })
  })

  // --- mapNetworkError ---

  describe('mapNetworkError (Req 12.4, 12.5)', () => {
    it('should map timeout errors', () => {
      const result = mapNetworkError(new Error('Request timeout'))
      expect(result.message).toBe('Request timed out, please retry')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map Chinese timeout errors', () => {
      const result = mapNetworkError(new Error('请求超时，请重试'))
      expect(result.message).toBe('Request timed out, please retry')
    })

    it('should map network offline errors', () => {
      const result = mapNetworkError(new Error('Network error'))
      expect(result.message).toBe('Network connection error, please check your network')
      expect(result.suggestion).toBeTruthy()
    })

    it('should map "Failed to fetch" errors', () => {
      const result = mapNetworkError(new Error('Failed to fetch'))
      expect(result.message).toBe('Network connection error, please check your network')
    })

    it('should map net:: errors (Chromium network errors)', () => {
      const result = mapNetworkError(new Error('net::ERR_INTERNET_DISCONNECTED'))
      expect(result.message).toBe('Network connection error, please check your network')
    })

    it('should map key not configured errors', () => {
      const result = mapNetworkError(new Error('API key not configured'))
      expect(result.message).toBe('Please configure your Code IDE API key first')
      expect(result.suggestion).toBeTruthy()
    })

    it('should return a generic message for unknown errors', () => {
      const result = mapNetworkError(new Error('Something unexpected'))
      expect(result.message).toBeTruthy()
      expect(result.suggestion).toBeTruthy()
    })

    it('should never include raw HTTP status codes in messages', () => {
      const errors = [
        new Error('Request timeout'),
        new Error('Network error'),
        new Error('Failed to fetch'),
        new Error('API key not configured'),
        new Error('Unknown error')
      ]
      for (const err of errors) {
        const result = mapNetworkError(err)
        expect(result.message).not.toMatch(/\b\d{3}\b/)
        expect(result.suggestion).not.toMatch(/\b\d{3}\b/)
      }
    })
  })

  // --- isRetryableError ---

  describe('isRetryableError', () => {
    it('should return true for 500', () => {
      expect(isRetryableError(500)).toBe(true)
    })

    it('should return true for 503', () => {
      expect(isRetryableError(503)).toBe(true)
    })

    it('should return false for 400', () => {
      expect(isRetryableError(400)).toBe(false)
    })

    it('should return false for 401', () => {
      expect(isRetryableError(401)).toBe(false)
    })

    it('should return false for 429', () => {
      expect(isRetryableError(429)).toBe(false)
    })
  })

  // --- executeWithRetry ---

  describe('executeWithRetry (Req 12.4 - auto retry for 500/503)', () => {
    it('should return the result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('ok')
      const result = await executeWithRetry(fn, 1)
      expect(result).toBe('ok')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry once on 500 error and succeed', async () => {
      const error500 = Object.assign(new Error('Server error'), { statusCode: 500 })
      const fn = jest.fn()
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce('recovered')

      const result = await executeWithRetry(fn, 1)
      expect(result).toBe('recovered')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should retry once on 503 error and succeed', async () => {
      const error503 = Object.assign(new Error('Service unavailable'), { statusCode: 503 })
      const fn = jest.fn()
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce('recovered')

      const result = await executeWithRetry(fn, 1)
      expect(result).toBe('recovered')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should throw after exhausting retries on 500', async () => {
      const error500 = Object.assign(new Error('Server error'), { statusCode: 500 })
      const fn = jest.fn().mockRejectedValue(error500)

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('Server error')
      expect(fn).toHaveBeenCalledTimes(2) // initial + 1 retry
    })

    it('should not retry on 401 error', async () => {
      const error401 = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      const fn = jest.fn().mockRejectedValue(error401)

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('Unauthorized')
      expect(fn).toHaveBeenCalledTimes(1) // no retry
    })

    it('should not retry on 400 error', async () => {
      const error400 = Object.assign(new Error('Bad request'), { statusCode: 400 })
      const fn = jest.fn().mockRejectedValue(error400)

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('Bad request')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not retry on 429 error', async () => {
      const error429 = Object.assign(new Error('Rate limited'), { statusCode: 429 })
      const fn = jest.fn().mockRejectedValue(error429)

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('Rate limited')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not retry on errors without statusCode', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Network failure'))

      await expect(executeWithRetry(fn, 1)).rejects.toThrow('Network failure')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should respect maxRetries = 0 (no retries)', async () => {
      const error500 = Object.assign(new Error('Server error'), { statusCode: 500 })
      const fn = jest.fn().mockRejectedValue(error500)

      await expect(executeWithRetry(fn, 0)).rejects.toThrow('Server error')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should support maxRetries > 1', async () => {
      const error500 = Object.assign(new Error('Server error'), { statusCode: 500 })
      const fn = jest.fn()
        .mockRejectedValueOnce(error500)
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce('finally')

      const result = await executeWithRetry(fn, 2)
      expect(result).toBe('finally')
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })
})
