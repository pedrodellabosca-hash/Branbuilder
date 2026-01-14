
import dotenv from "dotenv";
import Stripe from "stripe";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("💳 Verifying Stripe Configuration...");

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    let hasError = false;

    if (!secretKey) {
        console.error("❌ Missing STRIPE_SECRET_KEY in .env");
        hasError = true;
    } else if (!secretKey.startsWith("sk_")) {
        console.warn("⚠️ STRIPE_SECRET_KEY does not start with 'sk_'. Is this correct?");
    } else {
        console.log("✅ STRIPE_SECRET_KEY found.");
    }

    if (!webhookSecret) {
        console.error("❌ Missing STRIPE_WEBHOOK_SECRET in .env");
        hasError = true;
    } else if (!webhookSecret.startsWith("whsec_")) {
        console.warn("⚠️ STRIPE_WEBHOOK_SECRET does not start with 'whsec_'. Is this correct?");
    } else {
        console.log("✅ STRIPE_WEBHOOK_SECRET found.");
    }

    if (!publishableKey) {
        console.error("❌ Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env");
        hasError = true;
    } else {
        console.log("✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found.");
    }

    if (secretKey) {
        try {
            console.log("🔄 Testing Stripe API connection...");
            const stripe = new Stripe(secretKey, {
                apiVersion: "2024-12-18.acacia" as any, // Cast to avoid strict type checks if version differs
            });
            const account = await stripe.accounts.retrieve(); // Or balance.retrieve()
            console.log("✅ Stripe API Connection Successful!");
            // console.log("   Account:", account.id); 
        } catch (error: any) {
            console.error("❌ Stripe API Connection Failed:", error.message);
            hasError = true;
        }
    }

    if (hasError) {
        console.error("\n❌ Verification Failed. Please update your .env file.");
        process.exit(1);
    } else {
        console.log("\n✅ Verification Passed. Stripe is ready.");
    }
}

main();
