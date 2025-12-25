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
         * Match all request paths EXCEPT:
         * - _next (Next.js internals)
         * - Static files (images, fonts, etc.)
         * - Public API routes that should bypass Clerk entirely:
         *   - /api/ai/ping (health check)
         *   - /api/webhooks/clerk (Clerk webhooks)
         *   - /api/webhooks/stripe (Stripe webhooks)
         * 
         * These excluded routes will NOT trigger Clerk middleware at all,
         * so no x-clerk-* headers will be added.
         */
        '/((?!_next|api/ai/ping|api/webhooks/clerk|api/webhooks/stripe|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
