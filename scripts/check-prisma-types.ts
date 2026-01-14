
import { prisma } from "../lib/db/index";

async function main() {
    console.log("Checking Prisma Client models...");

    if ('userMfaSecret' in prisma) {
        console.log("SUCCESS: userMfaSecret exists on prisma client.");
    } else {
        console.error("FAILURE: userMfaSecret NOT found on prisma client.");
        console.log("Available keys:", Object.keys(prisma));
    }

    try {
        // @ts-ignore
        const count = await prisma.userMfaSecret.count();
        console.log(`Count result: ${count}`);
    } catch (e) {
        console.error("Runtime error querying userMfaSecret:", e);
    }
}

main().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect();
});
