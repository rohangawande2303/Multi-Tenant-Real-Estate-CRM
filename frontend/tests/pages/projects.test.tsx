import { render, screen } from '@testing-library/react';
import ProjectsPage from '@/app/(dashboard)/projects/page';
import { describe, it, expect, vi } from 'vitest';

// Mock AuthContext
vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({
        role: 'AGENCY',
    }),
}));

describe('ProjectsPage', () => {
    it('renders project grid', () => {
        render(<ProjectsPage />);
        expect(screen.getByText(/Active Projects/i)).toBeInTheDocument();
        expect(screen.getByText(/Project Alpha/i)).toBeInTheDocument();
        expect(screen.getByText(/Add New Project/i)).toBeInTheDocument();
    });
});
