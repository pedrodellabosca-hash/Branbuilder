
import dotenv from "dotenv";
import path from "path";
import { prisma } from "../lib/db";
import { commentService } from "../lib/collaboration/CommentService";
import { notificationService } from "../lib/collaboration/NotificationService";

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("🧪 Starting Collaboration Smoke Test...");

    // 1. Setup Data
    console.log("1. Setting up test data...");
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No organization found. Please seed DB.");

    const project = await prisma.project.create({
        data: {
            orgId: org.id,
            name: `Collab Test Project ${Date.now()}`,
            status: "IN_PROGRESS",
        }
    });

    const user1 = "user_test_1";
    const user1Email = "user1@test.com";

    const user2 = "user_test_2";
    const user2Email = "user2@test.com";

    // 2. Create Comment (Root)
    console.log("2. Creating Root Comment by User 1...");
    const rootComment = await commentService.createComment({
        projectId: project.id,
        content: "Root comment body",
        authorId: user1,
        authorEmail: user1Email
    });
    console.log(`   Root Comment: ${rootComment.id}`);

    // 3. Create Reply (User 2)
    console.log("3. Creating Reply from User 2...");
    const replyComment = await commentService.createComment({
        projectId: project.id,
        parentId: rootComment.id,
        content: "Reply comment body",
        authorId: user2,
        authorEmail: user2Email
    });
    console.log(`   Reply Comment: ${replyComment.id}`);

    // 4. Verify Notification for User 1
    console.log("4. Verifying Notification for User 1...");
    const notification = await prisma.notification.findFirst({
        where: {
            userId: user1,
            type: "COMMENT",
            read: false,
        },
        orderBy: { createdAt: "desc" }
    });

    if (!notification) {
        throw new Error("❌ Notification NOT created for User 1");
    }

    console.log(`   Notification found: "${notification.title}" - ${notification.message}`);

    if (!notification.message.includes(user2Email)) {
        throw new Error("❌ Notification message incorrect");
    }

    // 5. Cleanup
    console.log("5. Cleaning up...");
    await prisma.comment.deleteMany({ where: { projectId: project.id } });
    await prisma.notification.deleteMany({ where: { id: notification.id } });
    await prisma.project.delete({ where: { id: project.id } });

    console.log("\n✅ Collaboration Smoke Test Passed!");
}

main()
    .catch(e => {
        console.error("\n❌ Test Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
