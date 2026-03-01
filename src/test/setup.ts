import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { assertAllowedApiTarget } from '../services/networkPolicy'

const createMatchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as MediaQueryList)

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn<(query: string) => MediaQueryList>(createMatchMedia),
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const originalFetch = globalThis.fetch?.bind(globalThis)
if (originalFetch) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const target =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      assertAllowedApiTarget(target)
      return originalFetch(input, init)
    })
  )
}
