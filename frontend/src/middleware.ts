/**
 * File: src/middleware.ts
 * Purpose: Route protection and Agency email whitelist enforcement
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hardcoded for middleware since it runs in the edge and we want to avoid complex imports if possible
// Ideally, these should match src/lib/constants.ts
const AGENCY_EMAILS = [
    "admin@socialpulse.agency",
    "demo_admin@socialpulse.agency"
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Allow public assets and login page
    if (
        pathname.startsWith("/_next") ||
        pathname.includes("/favicon.ico") ||
        pathname.startsWith("/login") ||
        pathname === "/"
    ) {
        return NextResponse.next();
    }

    // 2. Check for authentication (via Cookie or Header)
    // In a real-world app, we'd use a secure cookie for the JWT
    // For this implementation, we check the presence of a token if possible 
    // (Note: Middleware cannot access localStorage, so token must be in cookies)
    const token = request.cookies.get("access_token")?.value;
    const userRole = request.cookies.get("user_role")?.value;
    const userEmail = request.cookies.get("user_email")?.value;

    // If no token and not on login page, redirect to login
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 3. Agency-only Route Protection
    if (pathname.startsWith("/agency")) {
        const isAgencyEmail = userEmail ? AGENCY_EMAILS.some(email => email.toLowerCase() === userEmail.toLowerCase()) : false;
        const isAgencyRole = userRole === "AGENCY" || userRole === "AGENCY_ADMIN";

        if (!isAgencyRole || !isAgencyEmail) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
    }

    // 4. Role-based restricted paths (e.g. Sales cannot access Users/Projects)
    if (pathname.startsWith("/users") || pathname.startsWith("/projects")) {
        const canAccessAdminPaths = userRole === "AGENCY" || userRole === "AGENCY_ADMIN" || userRole === "DEVELOPER" || userRole === "CLIENT_ADMIN" || userRole === "BD_MANAGER";
        if (!canAccessAdminPaths) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
    }

    return NextResponse.next();
}

/**
 * Configure which routes the middleware targets
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
