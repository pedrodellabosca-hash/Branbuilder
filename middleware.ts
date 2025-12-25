import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Public routes - no authentication required
 * Uses (.*) suffix for consistency and to handle trailing slashes/subpaths
 */
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks/clerk(.*)',
    '/api/webhooks/stripe(.*)',
    '/api/ai/ping(.*)',
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
         * Match all request paths except:
         * - _next (Next.js internals)
         * - Static files (images, fonts, etc.)
         * 
         * This single matcher covers both pages and API routes.
         * The negative lookahead excludes static assets by extension.
         */
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
