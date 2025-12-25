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
         *   - /api/ai/ping (and subpaths)
         *   - /api/webhooks/clerk/* 
         *   - /api/webhooks/stripe/*
         * 
         * Regex uses (?:/|$) to match segment boundary:
         * - /api/ai/ping → matches ($ = end of string)
         * - /api/ai/ping/ → matches (/ after ping)
         * - /api/ai/ping/foo → matches (/ after ping)
         * - /api/ai/pingX → does NOT match (no / or $ after ping)
         */
        '/((?!_next|api/ai/ping(?:/|$)|api/webhooks/clerk(?:/|$)|api/webhooks/stripe(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ],
}
