import { render, screen } from '@testing-library/react';
import IntegrationsPage from '@/app/(dashboard)/integrations/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

describe('IntegrationsPage', () => {
    it('renders integration connections', () => {
        render(<IntegrationsPage />);
        expect(screen.getByText(/Integrations Hub/i)).toBeInTheDocument();
        expect(screen.getByText(/Facebook Lead Ads/i)).toBeInTheDocument();
    });
});
