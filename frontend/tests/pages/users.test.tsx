import { render, screen } from '@testing-library/react';
import UsersPage from '@/app/(dashboard)/users/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

describe('UsersPage', () => {
    it('renders user team management list', () => {
        render(<UsersPage />);
        expect(screen.getByText(/Team Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Rohan Gawande/i)).toBeInTheDocument();
    });
});
