import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Verifying Database Connection...");

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("❌ DATABASE_URL is not set.");
        process.exit(1);
    }

    try {
        await prisma.$connect();
        const result = await prisma.$queryRawUnsafe("SELECT 1 as result");
        console.log("✅ Connection Successful!");
        console.log("✅ Query Execution: OK", result);
        process.exit(0);
    } catch (error) {
        console.error("❌ Database verification failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
