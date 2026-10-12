import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { describe, it, expect } from 'vitest';

describe('LoadingSpinner', () => {
    it('renders spinner element', () => {
        render(<LoadingSpinner />);
        expect(screen.getByText(/Syncing.../i)).toBeInTheDocument();
    });

    it('renders full page version correctly', () => {
        render(<LoadingSpinner fullPage />);
        expect(screen.getByText(/Social Pulse CRM/i)).toBeInTheDocument();
    });
});
