import { render, screen } from '@testing-library/react';
import AnalyticsPage from '@/app/(dashboard)/agency/analytics/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

// Mock Recharts
vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual('recharts') as any;
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    };
});

describe('AnalyticsPage', () => {
    it('renders agency analytics dashboard', () => {
        render(<AnalyticsPage />);
        expect(screen.getByText(/Global Ecosystem Analytics/i)).toBeInTheDocument();
        expect(screen.getByText(/Global Clients/i)).toBeInTheDocument();
        expect(screen.getByText(/Leads Processed/i)).toBeInTheDocument();
    });
});
