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
         * - Public API routes that bypass Clerk entirely:
         *   - /api/ai/ping (exact or with trailing content)
         *   - /api/webhooks/clerk/* 
         *   - /api/webhooks/stripe/*
         * 
         * Regex explanation:
         * - api/ai/ping(?:/.*|$) → matches /api/ai/ping, /api/ai/ping/, /api/ai/ping/anything
         *   but NOT /api/ai/pingX (the (?:/|$) ensures word boundary)
         * - api/webhooks/clerk(?:/.*|$) → same pattern for clerk webhooks
         * - api/webhooks/stripe(?:/.*|$) → same pattern for stripe webhooks
         */
        '/((?!_next|api/ai/ping(?:/.*)?$|api/webhooks/clerk(?:/.*)?$|api/webhooks/stripe(?:/.*)?$|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
