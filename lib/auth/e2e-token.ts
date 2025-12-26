/**
 * E2E Test Token Utilities
 * 
 * Creates and validates JWT tokens for CI/E2E testing.
 * ONLY works when E2E_TEST_SECRET is set AND NODE_ENV !== 'production'.
 * 
 * SECURITY:
 * - Tokens are only valid for testing, not real users
 * - Production explicitly blocks this functionality
 * - Requires secret header to generate tokens
 */

import { SignJWT, jwtVerify } from 'jose';

const E2E_TEST_SECRET = process.env.E2E_TEST_SECRET;
const IS_CI = process.env.CI === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Test user identity
export const E2E_TEST_USER = {
    userId: 'e2e_test_user_001',
    email: 'e2e-test@brandforge.test',
    orgId: 'e2e_test_org_001',
    orgName: 'E2E Test Organization',
};

/**
 * Check if E2E auth is available
 */
export function isE2EAuthEnabled(): boolean {
    // NEVER allow in production
    if (IS_PRODUCTION) return false;
    // Must have secret configured
    if (!E2E_TEST_SECRET) return false;
    return true;
}

/**
 * Generate a test JWT token for E2E
 */
export async function generateE2EToken(): Promise<string> {
    if (!isE2EAuthEnabled()) {
        throw new Error('E2E auth not enabled');
    }

    const secret = new TextEncoder().encode(E2E_TEST_SECRET);
    
    const token = await new SignJWT({
        sub: E2E_TEST_USER.userId,
        email: E2E_TEST_USER.email,
        orgId: E2E_TEST_USER.orgId,
        type: 'e2e_test',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

    return token;
}

/**
 * Validate an E2E test token
 */
export async function validateE2EToken(token: string): Promise<{
    valid: true;
    userId: string;
    email: string;
    orgId: string;
} | {
    valid: false;
    error: string;
}> {
    if (!isE2EAuthEnabled()) {
        return { valid: false, error: 'E2E auth not enabled' };
    }

    try {
        const secret = new TextEncoder().encode(E2E_TEST_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload.type !== 'e2e_test') {
            return { valid: false, error: 'Invalid token type' };
        }

        return {
            valid: true,
            userId: payload.sub as string,
            email: payload.email as string,
            orgId: payload.orgId as string,
        };
    } catch (error) {
        return { 
            valid: false, 
            error: error instanceof Error ? error.message : 'Token validation failed' 
        };
    }
}

/**
 * Validate the E2E secret header
 */
export function validateE2ESecret(headerValue: string | null): boolean {
    if (!isE2EAuthEnabled()) return false;
    if (!headerValue) return false;
    return headerValue === E2E_TEST_SECRET;
}
