/**
 * Vitest 测试环境设置
 */

// Mock fetch API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ success: true })
  })
) as any

// Mock navigator.sendBeacon
global.navigator.sendBeacon = vi.fn(() => true) as any

// Mock performance API
global.performance = {
  ...performance,
  now: vi.fn(() => Date.now()),
  getEntriesByType: vi.fn(() => [])
} as any

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
})) as any

// Mock MutationObserver
global.MutationObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => [])
})) as any

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
})) as any
