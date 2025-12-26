/**
 * POST /api/test/auth-token
 * 
 * Generate a test auth token for E2E testing in CI.
 * 
 * SECURITY CONTROLS:
 * 1. Returns 404 in production (endpoint doesn't exist)
 * 2. Returns 404 if E2E_TEST_SECRET not configured (endpoint doesn't exist)
 * 3. Uses timing-safe comparison for secret validation
 * 4. Returns 401 only for incorrect secret (after checks pass)
 * 
 * USAGE (CI):
 *   curl -X POST http://localhost:3000/api/test/auth-token \
 *     -H "x-e2e-secret: $E2E_TEST_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateE2EToken, isE2EAuthEnabled, validateE2ESecret, E2E_TEST_USER } from '@/lib/auth/e2e-token';

// Standard 404 response - reveals nothing about the endpoint
const NOT_FOUND = () => new NextResponse(null, { status: 404 });

export async function POST(request: NextRequest) {
    // HARD SECURITY CHECK #1: Production = 404 (endpoint doesn't exist)
    if (process.env.NODE_ENV === 'production') {
        return NOT_FOUND();
    }

    // HARD SECURITY CHECK #2: No secret configured = 404 (endpoint doesn't exist)
    if (!isE2EAuthEnabled()) {
        return NOT_FOUND();
    }

    // Now validate the provided secret
    const secret = request.headers.get('x-e2e-secret');

    // Missing or invalid secret = 401 (only after confirming endpoint exists)
    if (!validateE2ESecret(secret)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const token = await generateE2EToken();

        return NextResponse.json({
            token,
            expiresIn: '1h',
            user: {
                userId: E2E_TEST_USER.userId,
                email: E2E_TEST_USER.email,
                orgId: E2E_TEST_USER.orgId,
            },
        });
    } catch (error) {
        console.error('[E2E Auth] Error generating token:', error);
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}

// GET also returns 404 in production/unconfigured
export async function GET() {
    // Production = 404
    if (process.env.NODE_ENV === 'production') {
        return NOT_FOUND();
    }

    // Not configured = 404
    if (!isE2EAuthEnabled()) {
        return NOT_FOUND();
    }

    // Only if properly configured, return status
    return NextResponse.json({
        available: true,
        message: 'E2E auth endpoint ready',
    });
}
