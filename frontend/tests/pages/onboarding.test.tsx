import { render, screen } from '@testing-library/react';
import OnboardingPage from '@/app/(dashboard)/agency/clients/new/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

describe('OnboardingPage', () => {
    it('renders client onboarding wizard steps', () => {
        render(<OnboardingPage />);
        expect(screen.getByText(/Onboard New Client/i)).toBeInTheDocument();
        expect(screen.getByText(/Company Discovery/i)).toBeInTheDocument();
    });
});
