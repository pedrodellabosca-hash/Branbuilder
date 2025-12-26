/**
 * POST /api/test/auth-token
 * 
 * Generate a test auth token for E2E testing in CI.
 * 
 * SECURITY CONTROLS:
 * 1. NEVER works if NODE_ENV === 'production' (hard fail)
 * 2. Requires E2E_TEST_SECRET env var to be set
 * 3. Requires x-e2e-secret header with matching secret
 * 
 * USAGE (CI):
 *   curl -X POST http://localhost:3000/api/test/auth-token \
 *     -H "x-e2e-secret: $E2E_TEST_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateE2EToken, isE2EAuthEnabled, validateE2ESecret, E2E_TEST_USER } from '@/lib/auth/e2e-token';

export async function POST(request: NextRequest) {
    // HARD SECURITY CHECK - never allow in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Not available in production' },
            { status: 403 }
        );
    }

    // Check if E2E auth is enabled
    if (!isE2EAuthEnabled()) {
        return NextResponse.json(
            { error: 'E2E auth not configured. Set E2E_TEST_SECRET env var.' },
            { status: 503 }
        );
    }

    // Validate secret header
    const secret = request.headers.get('x-e2e-secret');
    if (!validateE2ESecret(secret)) {
        return NextResponse.json(
            { error: 'Invalid or missing x-e2e-secret header' },
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
            { error: 'Failed to generate token' },
            { status: 500 }
        );
    }
}

// GET returns status info
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ available: false, reason: 'production' });
    }

    return NextResponse.json({
        available: isE2EAuthEnabled(),
        reason: isE2EAuthEnabled() ? 'configured' : 'E2E_TEST_SECRET not set',
    });
}
