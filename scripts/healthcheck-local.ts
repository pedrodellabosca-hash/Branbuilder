import { spawnSync } from "child_process";

type Step = {
    name: string;
    command: string;
    args: string[];
    hint?: string;
};

const steps: Step[] = [
    {
        name: "verify:db",
        command: "npm",
        args: ["run", "verify:db"],
        hint: "Check DATABASE_URL and Docker Postgres."
    },
    {
        name: "db:status",
        command: "npm",
        args: ["run", "db:status"],
        hint: "Review migration status output."
    },
    {
        name: "db:seed",
        command: "npm",
        args: ["run", "db:seed"],
        hint: "Ensure Prisma schema matches migrations."
    },
    {
        name: "test-venture-prompts",
        command: "npx",
        args: ["tsx", "scripts/test-venture-prompts.ts"],
        hint: "Verify venture prompt wrappers and schemas."
    },
    {
        name: "smoke-test-venture-flow",
        command: "npx",
        args: ["tsx", "scripts/smoke-test-venture-flow.ts"],
        hint: "Ensure MOCK provider is enabled and DB is reachable."
    }
];

function runStep(step: Step): boolean {
    console.log(`\n==> ${step.name}`);
    const result = spawnSync(step.command, step.args, { stdio: "inherit" });
    if (result.status !== 0) {
        console.error(`❌ Failed: ${step.name}`);
        if (step.hint) {
            console.error(`Hint: ${step.hint}`);
        }
        return false;
    }
    console.log(`✅ Passed: ${step.name}`);
    return true;
}

function main() {
    console.log("🧪 Local Healthcheck");
    const failures: string[] = [];

    for (const step of steps) {
        const ok = runStep(step);
        if (!ok) {
            failures.push(step.name);
            break;
        }
    }

    if (failures.length > 0) {
        console.log("\n❌ Healthcheck failed.");
        process.exit(1);
    }

    console.log("\n✅ Healthcheck completed successfully.");
}

main();
