import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

// Safe bootstrap: only create if missing
if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
        try {
            fs.copyFileSync(examplePath, envPath);
            console.log('\x1b[32m%s\x1b[0m', '✅ .env created from .env.example');
        } catch (error) {
            console.error('❌ Failed to create .env');
            process.exit(1);
        }
    } else {
        console.warn('⚠️ .env.example missing. Skipping env bootstrap.');
    }
} else {
    // .env exists - do NOT overwrite
    // console.log('Checking env...'); 
}

