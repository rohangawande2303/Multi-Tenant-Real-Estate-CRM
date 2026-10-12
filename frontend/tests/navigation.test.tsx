import { render, screen, fireEvent } from '@testing-library/react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider } from '@/contexts/auth-context';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        user: { name: 'Admin User' },
        role: 'AGENCY',
        logout: vi.fn(),
        isAgency: true
    }),
    AuthProvider: ({ children }: any) => <div>{children}</div>
}));

describe('Navigation Flow', () => {
    it('renders sidebar links and allows clicking', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Leads')).toBeInTheDocument();

        const leadsLink = screen.getByText('Leads');
        fireEvent.click(leadsLink);
        // In a real browser this would navigate, here we just check it exists and is clickable
    });
});
