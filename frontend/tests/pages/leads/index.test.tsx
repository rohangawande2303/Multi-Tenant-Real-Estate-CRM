import { render, screen } from '@testing-library/react';
import LeadsPage from '@/app/(dashboard)/leads/page';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('Leads Page', () => {
    it('renders lead list and search', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <LeadsPage />
            </QueryClientProvider>
        );

        expect(await screen.findByText(/John Doe/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });
});
