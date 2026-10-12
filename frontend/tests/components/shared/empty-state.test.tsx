import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/shared/empty-state';
import { describe, it, expect, vi } from 'vitest';
import { Search } from 'lucide-react';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(
            <EmptyState
                icon={Search}
                title="No Results"
                description="Try searching for something else"
            />
        );
        expect(screen.getByText('No Results')).toBeInTheDocument();
        expect(screen.getByText('Try searching for something else')).toBeInTheDocument();
    });

    it('calls onAction when button is clicked', () => {
        const mockAction = vi.fn();
        render(
            <EmptyState
                icon={Search}
                title="No Results"
                description="Try again"
                actionLabel="Retry"
                onAction={mockAction}
            />
        );

        fireEvent.click(screen.getByText('Retry'));
        expect(mockAction).toHaveBeenCalledTimes(1);
    });
});
