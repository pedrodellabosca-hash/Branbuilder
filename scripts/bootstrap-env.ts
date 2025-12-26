import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

if (fs.existsSync(envPath)) {
    // It exists, do nothing (idempotent)
    process.exit(0);
}

if (!fs.existsSync(examplePath)) {
    console.error('\x1b[31m%s\x1b[0m', '❌ .env.example not found! Cannot bootstrap environment.');
    process.exit(1);
}

try {
    fs.copyFileSync(examplePath, envPath);
    console.log('\x1b[32m%s\x1b[0m', '✅ .env created from .env.example');
    console.log('\x1b[36m%s\x1b[0m', '💡 Please update .env with your real API keys (Clerk, OpenAI).');
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to copy .env.example to .env');
    console.error(error);
    process.exit(1);
}
