import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/shared/page-header';
import { describe, it, expect } from 'vitest';
import { LayoutDashboard } from 'lucide-react';

describe('PageHeader', () => {
    it('renders title correctly', () => {
        render(<PageHeader title="Test Title" />);
        expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders description if provided', () => {
        render(<PageHeader title="Test Title" description="Test Description" />);
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders icon if provided', () => {
        render(<PageHeader title="Test Title" icon={LayoutDashboard} />);
        // Recharts/Lucide icons usually render as SVGs or components with specific tags
        expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders children (actions)', () => {
        render(
            <PageHeader title="Test Title">
                <button>Action Button</button>
            </PageHeader>
        );
        expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
});
