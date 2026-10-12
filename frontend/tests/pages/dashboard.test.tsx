import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('Dashboard Page', () => {
    it('renders dashboard stats', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <DashboardPage />
                </AuthProvider>
            </QueryClientProvider>
        );

        // Check for some header text or KPI
        expect(await screen.findByText(/Dashboard/i)).toBeInTheDocument();
    });
});
