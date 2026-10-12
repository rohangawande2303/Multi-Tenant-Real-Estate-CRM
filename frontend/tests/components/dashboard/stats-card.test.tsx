import { render, screen } from '@testing-library/react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { describe, it, expect } from 'vitest';
import { Users } from 'lucide-react';

describe('StatsCard', () => {
    it('renders title and value', () => {
        render(<StatsCard title="Total Leads" value="1,234" icon={Users} />);
        expect(screen.getByText('Total Leads')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('renders trend if provided', () => {
        render(
            <StatsCard
                title="Revenue"
                value="$50k"
                icon={Users}
                trend={{ value: 15, isUp: true }}
            />
        );
        expect(screen.getByText('15%')).toBeInTheDocument();
    });
});
