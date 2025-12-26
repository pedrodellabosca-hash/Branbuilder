import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.log('\x1b[31m%s\x1b[0m', '❌ .env file not found!');
    process.exit(1);
}

const requiredVars = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DATABASE_URL",
    "OPENAI_API_KEY",
];

const optionalVars = ['NEXT_PUBLIC_AUTH_MODE'];

let hasError = false;

console.log('\x1b[36m%s\x1b[0m', '🔍 Verifying Environment Variables...\n');

// 1. Check Clerk
const clerkPub = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkSecret = process.env.CLERK_SECRET_KEY;

if (!clerkPub) {
    console.log('\x1b[31m%s\x1b[0m', '❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.');
    hasError = true;
} else if (clerkPub.includes('YOUR_KEY_HERE') || clerkPub.includes('placeholder')) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is a placeholder.');
    console.log('   Get your key from https://dashboard.clerk.com');
    hasError = true;
} else if (!clerkPub.startsWith('pk_')) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY should start with pk_');
    hasError = true;
} else {
    console.log('\x1b[32m%s\x1b[0m', '✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.');
}

if (!clerkSecret) {
    console.log('\x1b[31m%s\x1b[0m', '❌ CLERK_SECRET_KEY is missing.');
    hasError = true;
} else if (clerkSecret.includes('YOUR_KEY_HERE') || clerkSecret.includes('placeholder')) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  CLERK_SECRET_KEY is a placeholder.');
    hasError = true;
} else if (!clerkSecret.startsWith('sk_')) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  CLERK_SECRET_KEY should start with sk_');
    hasError = true;
} else {
    console.log('\x1b[32m%s\x1b[0m', '✅ CLERK_SECRET_KEY is set.');
}

// 2. Check OpenAI
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
    console.log('\x1b[31m%s\x1b[0m', '❌ OPENAI_API_KEY is missing.');
    hasError = true;
} else if (openaiKey.startsWith('sk-proj') || openaiKey.startsWith('sk-')) {
    console.log('\x1b[32m%s\x1b[0m', '✅ OPENAI_API_KEY is set.');
} else {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  OPENAI_API_KEY does not modify standard format (sk-...). Checking validity...');
    // Technically valid to have other formats via proxies, but usually it starts with sk-
    console.log('\x1b[32m%s\x1b[0m', '✅ OPENAI_API_KEY is set (custom format).');
}

// 3. Database
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.log('\x1b[31m%s\x1b[0m', '❌ DATABASE_URL is missing.');
    hasError = true;
} else {
    console.log('\x1b[32m%s\x1b[0m', '✅ DATABASE_URL is set.');
}

// 4. Auth Mode
const authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
if (authMode && authMode !== 'clerk' && authMode !== 'none') {
    console.log('\x1b[33m%s\x1b[0m', `⚠️  NEXT_PUBLIC_AUTH_MODE is set to '${authMode}'. valid values: 'clerk', 'none'`);
} else if (authMode === 'none') {
    console.log('\x1b[34m%s\x1b[0m', 'ℹ️  Auth Mode is set to NONE (Mock Auth).');
} else {
    console.log('\x1b[32m%s\x1b[0m', '✅ Auth Mode is CLERK (default).');
}

console.log('\n');

if (hasError) {
    console.log('\x1b[31m%s\x1b[0m', '❌ Verification Failed. Please fix the issues in .env');
    process.exit(1);
} else {
    console.log('\x1b[32m%s\x1b[0m', '🎉 Environment verified successfully!');
    process.exit(0);
}
