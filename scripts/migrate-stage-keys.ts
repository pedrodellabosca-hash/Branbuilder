
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_MAPPING: Record<string, string> = {
    // Module A
    "A1": "context",
    "A2": "naming",
    "A3": "manifesto",
    "A4": "visual_identity",
    "A5": "applications",
    "A6": "closing",
    // Module B
    "B1": "briefing",
    "B2": "insights",
    "B3": "strategy",
    "B4": "cso",
    "B5": "metrics",
    "B6": "narrative",
    "B7": "integration",
    "B8": "delivery",
};

async function main() {
    console.log("🚀 Starting Stage Key Migration...");

    const stages = await prisma.stage.findMany({});
    console.log(`Found ${stages.length} stages to check.`);

    let migratedCount = 0;

    for (const stage of stages) {
        // Check if stageKey is one of the old codes (A1, A2...)
        if (STAGE_MAPPING[stage.stageKey]) {
            const newKey = STAGE_MAPPING[stage.stageKey];
            const oldKey = stage.stageKey;

            // Update: set stageKey to technical name, displayKey to old code
            await prisma.stage.update({
                where: { id: stage.id },
                data: {
                    stageKey: newKey,
                    displayKey: oldKey,
                },
            });

            console.log(`✅ Migrated Stage ${stage.id}: ${oldKey} -> ${newKey} (display: ${oldKey})`);
            migratedCount++;
        }
    }

    console.log(`\n✨ Migration Complete. Updated ${migratedCount} stages.`);
}

main()
    .catch((e) => {
        console.error("❌ Migration Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
