import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes for UI pages (still run middleware but skip auth.protect)
 */
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, request) => {
    // Protect all routes except public ones
    if (!isPublicRoute(request)) {
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
         * - No auth.protect() checks
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
