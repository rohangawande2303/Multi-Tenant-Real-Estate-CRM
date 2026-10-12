import { render, screen } from '@testing-library/react';
import { LeadTimeline } from '@/components/leads/lead-timeline';
import { describe, it, expect } from 'vitest';

const mockActivities = [
    {
        id: "act_1",
        timestamp: new Date().toISOString(),
        content: 'Lead Created',
        performed_by_name: 'System',
        data: { activity_type: 'creation' }
    },
    {
        id: "act_2",
        timestamp: new Date().toISOString(),
        content: 'Call Logged',
        performed_by_name: 'John Sales',
        data: { activity_type: 'call' }
    }
];

describe('LeadTimeline', () => {
    it('renders activities in order', () => {
        render(<LeadTimeline items={mockActivities} />);
        expect(screen.getByText('Lead Created')).toBeInTheDocument();
        expect(screen.getByText('Call Logged')).toBeInTheDocument();
        expect(screen.getByText(/John Sales/i)).toBeInTheDocument();
    });

    it('shows empty state when no activities', () => {
        render(<LeadTimeline items={[]} />);
        expect(screen.getByText(/No activity recorded yet/i)).toBeInTheDocument();
    });
});
