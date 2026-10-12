import { render, screen } from '@testing-library/react';
import AgencyClientsPage from '@/app/(dashboard)/agency/clients/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

describe('AgencyClientsPage', () => {
    it('renders agency client list', () => {
        render(<AgencyClientsPage />);
        expect(screen.getByText(/Agency Clients/i)).toBeInTheDocument();
        expect(screen.getByText(/Golden Bricks Realty/i)).toBeInTheDocument();
    });
});
