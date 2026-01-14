
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Fail fast in production if key is missing, but allow soft failure in dev/mock
if (!STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
        typescript: true,
    })
    : null; // Nullable for mock mode support

// Plans map to Price IDs (To be configured in Env or DB)
export const PLANS = {
    BASIC: {
        id: 'BASIC',
        priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY,
        tokens: 100000,
    },
    PRO: {
        id: 'PRO',
        priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
        tokens: 500000,
    }
};

export async function createCheckoutSession(orgId: string, priceId: string, returnUrl: string, customerId?: string | null) {
    if (!stripe) throw new Error('Stripe not configured');

    const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        metadata: {
            orgId,
        },
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
    };

    // If we have an existing customer ID for this org, use it to avoid duplicates
    if (customerId) {
        params.customer = customerId;
        params.customer_update = {
            address: 'auto',
            name: 'auto',
        };
    } else {
        // Otherwise, ask Stripe to create a customer (default behavior), 
        // but maybe we want to pass email if we have it? 
        // For B2B, allow user to enter it.
    }

    return stripe.checkout.sessions.create(params);
}
