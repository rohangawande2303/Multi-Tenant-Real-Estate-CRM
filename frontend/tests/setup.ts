import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll, vi, expect } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Setup Mock Service Worker (MSW)
export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
});
afterAll(() => server.close());

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({}),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock window functions
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock LocalStorage
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key: string) => { delete store[key]; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Cookies
vi.mock('cookie-cutter', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
    }
}));
