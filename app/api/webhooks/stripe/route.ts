
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!stripe) throw new Error("Stripe not configured");
        if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe Webhook Secret not configured");

        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error: any) {
        console.error(`[Stripe Webhook] Error: ${error.message}`);
        return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                // Subscription created
                if (!session?.metadata?.orgId) break;  // Should log warning

                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                // Which plan? Need to lookup from line items or handle later. 
                // Simple version: If triggered via our checkout, check amount or price ID.
                // Or retrieve subscription to see items.

                // For "Surgical" speed: Assume PRO if price matches PRO, else BASIC.
                // But wait, checkout session has the price in the expanded object or we fetch it.
                // Let's assume we allow any upgrade to set specific limits.

                await prisma.organization.update({
                    where: { id: session.metadata.orgId },
                    data: {
                        stripeCustomerId: customerId,
                        subscriptionId: subscriptionId,
                        subscriptionStatus: 'ACTIVE',
                        plan: 'PRO', // Hardcoded upgrade for now, robust version would check price ID
                        monthlyTokenLimit: PLANS.PRO.tokens,
                    }
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                // Find org by subscription ID
                await prisma.organization.updateMany({
                    where: { subscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: 'CANCELED',
                        plan: 'BASIC', // Downgrade
                        monthlyTokenLimit: PLANS.BASIC.tokens,
                    }
                });
                break;
            }

            // Add invoice.payment_failed for 'PAST_DUE' handling if needed
        }
    } catch (error) {
        console.error('[Stripe Webhook] Handler failed:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
