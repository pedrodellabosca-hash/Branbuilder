
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2024-12-18.acacia" as any, // Cast to avoid strict type checks
    typescript: true,
});

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production") {
    console.warn("⚠️ STRIPE_SECRET_KEY is missing. Billing features will fail.");
}
