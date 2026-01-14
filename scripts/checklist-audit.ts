import fs from 'fs';
import path from 'path';

// Simple console color helper if no deps allowed
const colors = {
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

const REQUIRED_FILES = [
    // Core
    'prisma/schema.prisma',
    'lib/modules/ModuleEngine.ts',
    'lib/stages/runStage.ts',
    'lib/outputs/OutputService.ts',
    'lib/jobs/worker.ts',

    // Usage
    'lib/usage/index.ts',
    'components/layout/UsageBar.tsx',

    // UI
    'components/project/StageActions.tsx',
    'components/project/StageOutputPanel.tsx',

    // Scripts
    'scripts/verify-async-flow.ts',
    'scripts/verify-token-gating.ts'
];

const OPTIONAL_FILES = [
    'components/library/LibraryPanel.tsx',
    'components/collaboration/Comments.tsx',
    'components/admin/PromptRegistry.tsx'
];

async function runAudit() {
    console.log(colors.bold("🔍 Starting Checklist Audit...\n"));

    let missingCritical = 0;

    console.log(colors.bold("--- Critical Evidence ---"));
    for (const file of REQUIRED_FILES) {
        if (fs.existsSync(file)) {
            console.log(`${colors.green('✅ Found:')} ${file}`);
        } else {
            console.log(`${colors.red('❌ MISSING:')} ${file}`);
            missingCritical++;
        }
    }

    console.log(colors.bold("\n--- Feature Status Checks (Optional/Future) ---"));
    for (const file of OPTIONAL_FILES) {
        if (fs.existsSync(file)) {
            console.log(`${colors.green('✅ Found:')} ${file}`);
        } else {
            console.log(`${colors.yellow('⚠️  Not Implemented:')} ${file}`);
        }
    }

    console.log("\n" + colors.bold("--- Summary ---"));
    if (missingCritical === 0) {
        console.log(colors.green("All critical implementation files are present."));
    } else {
        console.log(colors.red(`Audit FAILED. ${missingCritical} critical files missing.`));
        process.exit(1);
    }
}

runAudit().catch(console.error);
