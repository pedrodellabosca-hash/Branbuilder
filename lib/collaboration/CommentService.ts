
import { prisma } from "@/lib/db";
import { notificationService } from "./NotificationService";

export interface CreateCommentParams {
    projectId: string;
    stageId?: string;
    parentId?: string;
    content: string;
    authorId: string;
    authorEmail: string;
}

export class CommentService {
    /**
     * Create a comment and notify mentioned users
     */
    async createComment(params: CreateCommentParams) {
        const { projectId, stageId, parentId, content, authorId, authorEmail } = params;

        // 1. Detect mentions
        // Regex for @username or @email (simplified for now to match @ followed by non-whitespace)
        // In a real app, you'd want to match against real IDs/usernames. 
        // For now, let's assume specific format or just notify project members if we can't resolve specifics nicely yet.
        // Or better: Let's extract valid emails/ids if possible.
        // Simplest: Just save the comment first, we can refine mention logic later to be specific.

        // However, we want to notify the Parent Author if it's a reply.
        let parentAuthorId: string | undefined;

        if (parentId) {
            const parent = await prisma.comment.findUnique({
                where: { id: parentId },
                select: { authorId: true }
            });
            if (parent && parent.authorId !== authorId) {
                parentAuthorId = parent.authorId;
            }
        }

        // 2. Create Comment
        const comment = await prisma.comment.create({
            data: {
                projectId,
                stageId,
                parentId,
                content,
                authorId,
                authorEmail,
                mentions: [], // Populate if we parse them
            },
        });

        // 3. Notify Parent Author (Reply)
        if (parentAuthorId) {
            await notificationService.notifyUser({
                userId: parentAuthorId,
                projectId,
                type: "COMMENT",
                title: "New Reply",
                message: `${authorEmail} replied to your comment.`,
                link: `/projects/${projectId}?comment=${comment.id}`,
            });
        }

        // 4. Notify Project Members (optional, maybe filtering to avoiding spam)
        // For now, let's just stick to replies to be surgical.

        return comment;
    }

    /**
     * Get comments for a context (Project or Stage)
     */
    async getComments(projectId: string, stageId?: string) {
        return prisma.comment.findMany({
            where: {
                projectId,
                stageId: stageId || undefined, // If stageId is explicitly null/undefined in call, might fetch all project comments? 
                // Usually we want either Project-Globals OR Stage-Specific.
                // If stageId is provided, filter by it.
                // If not, maybe filter where stageId is null? Or all?
                // Let's filter by stageId if provided, otherwise all for project.
            },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Get threaded view (parents only with nested replies)
     */
    async getThreads(projectId: string, stageId?: string) {
        return prisma.comment.findMany({
            where: {
                projectId,
                stageId: stageId || null, // null means "Project Level" comment
                parentId: null, // Only root comments
            },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Delete comment
     */
    async deleteComment(commentId: string, userId: string) {
        // Only author can delete
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) throw new Error("Comment not found");
        if (comment.authorId !== userId) throw new Error("Unauthorized");

        return prisma.comment.delete({
            where: { id: commentId }
        });
    }
}

export const commentService = new CommentService();
