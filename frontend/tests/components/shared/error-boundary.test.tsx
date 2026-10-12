import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { describe, it, expect, vi } from 'vitest';

const ProblemChild = () => {
    throw new Error('Test Error');
};

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Safe Content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });

    it('renders fallback UI when an error is caught', () => {
        // Suppress console.error for this test to keep logs clean
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <ProblemChild />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        consoleSpy.mockRestore();
    });
});
