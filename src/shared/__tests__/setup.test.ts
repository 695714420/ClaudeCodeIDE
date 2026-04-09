import * as fc from 'fast-check'

describe('Project Setup Verification', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support fast-check property testing', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a)
      }),
      { numRuns: 100 }
    )
  })

  it('should support TypeScript strict mode features', () => {
    const value: string | null = 'hello'
    // Strict null checks work
    if (value !== null) {
      expect(value.length).toBe(5)
    }
  })
})
