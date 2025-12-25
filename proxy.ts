import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Public routes for UI pages (still run middleware but skip auth)
 */
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
])

/**
 * Check if path is an API route
 */
function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/') || pathname.startsWith('/trpc/')
}

export const proxy = clerkMiddleware(async (auth, request) => {
    const { pathname } = request.nextUrl

    // Skip public routes
    if (isPublicRoute(request)) {
        return
    }

    // Get auth state
    const { userId } = await auth()

    // If no user session
    if (!userId) {
        // API routes: return 401 JSON (not redirect)
        if (isApiRoute(pathname)) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                {
                    status: 401,
                    headers: {
                        'Cache-Control': 'no-store, max-age=0',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Vary': 'Cookie',
                    },
                }
            )
        }

        // Non-API routes: redirect to sign-in (normal Clerk behavior)
        await auth.protect()
    }
})

export const config = {
    matcher: [
        /*
         * IMPORTANT: Middleware Matcher Configuration
         * ============================================
         * 
         * This regex excludes certain paths from the Clerk middleware entirely.
         * Excluded routes will NOT trigger any middleware code, meaning:
         * - No x-clerk-* headers
         * - No x-middleware-rewrite headers  
         * - No auth checks of any kind
         * 
         * EXCLUDED ROUTES (by design):
         * - api/ai/ping      → Health check endpoint (must be public)
         * - api/webhooks/*   → Webhook endpoints (external services need access)
         * 
         * ⚠️  CRITICAL: DO NOT add leading slashes to paths in the lookahead!
         * ⚠️  WRONG: '/api/ai/ping' - This breaks the exclusion
         * ⚠️  RIGHT: 'api/ai/ping'  - Next.js matcher expects this format
         * 
         * The (?:/|$) suffix matches:
         * - /api/ai/ping     ($ = end of string)
         * - /api/ai/ping/    (/ = trailing slash)
         * - /api/ai/ping/foo (/ = subpath)
         * But NOT:
         * - /api/ai/pingX    (no boundary after 'ping')
         */
        '/((?!_next|api/ai/ping(?:/|$)|api/webhooks/clerk(?:/|$)|api/webhooks/stripe(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
