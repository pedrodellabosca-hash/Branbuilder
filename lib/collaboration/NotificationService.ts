
import { prisma } from "@/lib/db";
import { type NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
    userId: string;
    orgId?: string;
    projectId?: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
}

export class NotificationService {
    /**
     * Create a single notification for a user
     */
    async notifyUser(params: CreateNotificationParams) {
        return prisma.notification.create({
            data: {
                userId: params.userId,
                orgId: params.orgId,
                projectId: params.projectId,
                type: params.type,
                title: params.title,
                message: params.message,
                link: params.link,
                metadata: params.metadata || {},
            },
        });
    }

    /**
     * Create notifications for multiple users
     */
    async notifyMany(userIds: string[], params: Omit<CreateNotificationParams, "userId">) {
        return prisma.$transaction(
            userIds.map((userId) =>
                prisma.notification.create({
                    data: {
                        userId,
                        orgId: params.orgId,
                        projectId: params.projectId,
                        type: params.type,
                        title: params.title,
                        message: params.message,
                        link: params.link,
                        metadata: params.metadata || {},
                    },
                })
            )
        );
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        return prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId: userId, // Security check
            },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: {
                userId: userId,
                read: false,
            },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
    }
}

export const notificationService = new NotificationService();
