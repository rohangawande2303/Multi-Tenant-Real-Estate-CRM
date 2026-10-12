import { render, screen } from '@testing-library/react';
import { LeadTable } from '@/components/leads/lead-table';
import { describe, it, expect } from 'vitest';
import { Lead } from '@/types/lead';

const mockLeads: Lead[] = [
    {
        id: "lead_12345678",
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'NEW',
        source_group: 'Website',
        tenant_id: 1,
        project_id: 101,
        lead_score: 50,
        city: 'Mumbai',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        custom_fields: {}
    }
];

describe('LeadTable', () => {
    it('renders lead data rows', () => {
        render(<LeadTable data={mockLeads} />);
        expect(screen.getByText('Test Lead')).toBeInTheDocument();
        expect(screen.getByText(/NEW/i)).toBeInTheDocument();
    });

    it('shows empty state when no leads', () => {
        render(<LeadTable data={[]} />);
        expect(screen.getByText(/No results./i)).toBeInTheDocument();
    });
});
