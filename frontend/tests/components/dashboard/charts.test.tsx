import { render, screen } from '@testing-library/react';
import { PieChart } from '@/components/dashboard/charts/pie-chart';
import { BarChart } from '@/components/dashboard/charts/bar-chart';
import { describe, it, expect, vi } from 'vitest';

// Mock Recharts because it uses ResizeObserver and SVG elements that are hard to test in JSDOM
vi.mock('recharts', async () => {
    const OriginalModule = await vi.importActual('recharts') as any;
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: '800px', height: '400px' }}>{children}</div>,
    };
});

const pieData = [
    { name: 'Direct', value: 400 },
    { name: 'Referral', value: 300 },
];

const barData = [
    { name: 'Jan', value: 40 },
    { name: 'Feb', value: 70 },
];

describe('Charts', () => {
    it('renders PieChart', () => {
        // Just checking if it renders without crashing in JSDOM
        const { container } = render(<PieChart data={pieData} />);
        expect(container).toBeInTheDocument();
    });

    it('renders BarChart', () => {
        const { container } = render(<BarChart data={barData} />);
        expect(container).toBeInTheDocument();
    });
});
