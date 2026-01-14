
import "dotenv/config";

async function verify() {
    console.log("🚀 Verifying Admin Access Config...");

    // 1. Env Var Check
    const ids = process.env.SUPERADMIN_USER_IDS;
    if (ids) {
        console.log(`✅ SUPERADMIN_USER_IDS present: ${ids.length > 5 ? ids.substring(0, 5) + "..." : ids}`);
    } else {
        console.error("❌ SUPERADMIN_USER_IDS is MISSING or empty.");
        console.log("   Update .env with: SUPERADMIN_USER_IDS=user_abc123");
    }

    // 2. Middleware Existence Check
    const fs = require('fs');
    if (fs.existsSync('middleware.ts')) {
        console.log("✅ middleware.ts exists.");
    } else {
        console.warn("⚠️ middleware.ts not found. Routes might not be protected correctly.");
    }

    console.log("\nNext Steps:");
    console.log("1. Run 'npm run dev'");
    console.log("2. Open http://localhost:3000/api/admin/whoami (should return JSON with isSuperAdmin=true/false)");
    console.log("3. If true, navigate to /admin/health");
}

verify().catch(console.error);
