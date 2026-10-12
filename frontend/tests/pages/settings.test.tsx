import { render, screen } from '@testing-library/react';
import SettingsPage from '@/app/(dashboard)/settings/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        user: { name: 'Admin', email: 'admin@socialpulse.com' },
        role: 'AGENCY',
    }),
}));

describe('SettingsPage', () => {
    it('renders profile and team settings', () => {
        render(<SettingsPage />);
        expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/admin@socialpulse.com/i)).toBeInTheDocument();
    });
});
