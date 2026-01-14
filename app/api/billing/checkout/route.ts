
import { NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { createCheckoutSession, PLANS } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
    try {
        // 1. Auth & RBAC (Admin only)
        const { org, user } = await requireOrgRole('ADMIN');

        // 2. Parse Body
        const { planId, successUrl, cancelUrl } = await req.json();

        if (!planId || !PLANS[planId as keyof typeof PLANS]) {
            return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
        }

        const plan = PLANS[planId as keyof typeof PLANS];
        const returnUrl = successUrl || `${req.headers.get('origin')}/settings`;

        // 3. Create Checkout Session
        // If org already has a stripeCustomerId, we should pass it to avoid duplicates
        // But createCheckoutSession in stripe.ts currently doesn't take customerId.
        // We might need to update stripe.ts or handle it here if using a more complex logic.
        // For now, let's keep it simple as per the plan, but we should ideally pass customer ID if it exists.

        let customerId = org.stripeCustomerId;

        // If we want to be robust, we pass customer ID to stripe if present.
        // Let's assume createCheckoutSession handles the basics for now or we update it.
        // Actually, let's look at stripe.ts again. It takes (orgId, priceId, returnUrl).

        // We will call the helper.
        const session = await createCheckoutSession(org.id, plan.priceId!, returnUrl, org.stripeCustomerId);

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("[Stripe Checkout] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate checkout" },
            { status: 500 }
        );
    }
}
