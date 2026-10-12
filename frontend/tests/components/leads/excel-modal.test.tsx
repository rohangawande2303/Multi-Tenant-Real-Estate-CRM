import { render, screen, fireEvent } from '@testing-library/react';
import { ExcelModal } from '@/components/leads/excel-modal';
import { describe, it, expect, vi } from 'vitest';

describe('ExcelModal', () => {
    it('renders when isOpen is true', () => {
        render(<ExcelModal isOpen={true} onClose={() => { }} />);
        expect(screen.getByText('Import Leads')).toBeInTheDocument();
    });

    it('calls onClose when closed', () => {
        const mockClose = vi.fn();
        render(<ExcelModal isOpen={true} onClose={mockClose} />);

        // Find cancel button
        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);
        expect(mockClose).toHaveBeenCalled();
    });
});
