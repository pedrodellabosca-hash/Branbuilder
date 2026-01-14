
import { NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/auth';
import { stripe } from '@/lib/billing/stripe';

export async function POST(req: Request) {
    try {
        // 1. Auth & RBAC (Admin only)
        const { org } = await requireOrgRole('ADMIN');

        if (!org.stripeCustomerId) {
            return NextResponse.json(
                { error: "No billing account found. Please subscribe to a plan first." },
                { status: 400 }
            );
        }

        if (!stripe) {
            return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
        }

        // 2. Create Portal Session
        const returnUrl = `${req.headers.get('origin')}/settings`;

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("[Stripe Portal] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create portal session" },
            { status: 500 }
        );
    }
}
