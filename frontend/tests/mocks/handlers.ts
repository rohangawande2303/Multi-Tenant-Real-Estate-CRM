import { http, HttpResponse } from 'msw';

export const handlers = [
    // Auth
    http.post('*/api/v1/auth/login', () => {
        return HttpResponse.json({
            access_token: 'mock-token',
            user: {
                id: 1,
                name: 'Agency Admin',
                email: 'admin@socialpulse.agency',
                role: 'AGENCY'
            }
        });
    }),

    // Leads
    http.get('*/api/v1/leads', () => {
        return HttpResponse.json([
            { id: 1, name: 'John Doe', phone: '9876543210', status: 'NEW', city: 'Mumbai', created_at: new Date().toISOString(), custom_fields: {} },
            { id: 2, name: 'Jane Smith', phone: '9822334455', status: 'HOT', city: 'Delhi', created_at: new Date().toISOString(), custom_fields: {} }
        ]);
    }),

    // Projects
    http.get('*/api/v1/projects', () => {
        return HttpResponse.json([
            { id: 101, name: 'Alpha Tower', status: 'ACTIVE', tenant_id: 1 },
            { id: 102, name: 'Beta Square', status: 'ACTIVE', tenant_id: 1 }
        ]);
    }),

    // Users
    http.get('*/api/v1/users', () => {
        return HttpResponse.json([
            { id: 1, name: 'Agency Admin', email: 'admin@socialpulse.agency', role: 'AGENCY', is_active: true }
        ]);
    }),

    // Dashboard Stats
    http.get('*/api/v1/dashboard/stats', () => {
        return HttpResponse.json({
            total_leads: 156,
            new_leads: 12,
            hot_leads: 45,
            conversions: 8
        });
    })
];
