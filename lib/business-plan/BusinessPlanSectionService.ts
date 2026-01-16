import { Prisma, BusinessPlanSectionKey } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateSectionInput = {
    key: BusinessPlanSectionKey;
    content: Record<string, unknown>;
};

export class SectionConflictError extends Error {
    code = "SECTION_CONFLICT" as const;
}

export class InvalidSectionError extends Error {
    code = "INVALID_SECTION" as const;
}

export class BusinessPlanSectionService {
    async createSections(businessPlanId: string, sections: CreateSectionInput[]) {
        if (!sections.length) {
            throw new InvalidSectionError("Sections required");
        }

        const keys = sections.map((section) => section.key);
        const uniqueKeys = new Set(keys);
        if (uniqueKeys.size !== keys.length) {
            throw new InvalidSectionError("Duplicate keys in request");
        }

        return prisma.$transaction(async (tx) => {
            const existing = await tx.businessPlanSection.findMany({
                where: {
                    businessPlanId,
                    key: { in: keys },
                },
                select: { key: true },
            });

            if (existing.length > 0) {
                throw new SectionConflictError("Section already exists");
            }

            const created = await Promise.all(
                sections.map((section) =>
                    tx.businessPlanSection.create({
                        data: {
                            businessPlanId,
                            key: section.key,
                            title: section.key,
                            content: section.content,
                        },
                        select: { id: true, key: true },
                    })
                )
            );

            return created;
        }).catch((error) => {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new SectionConflictError("Section already exists");
            }
            throw error;
        });
    }
}

export const businessPlanSectionService = new BusinessPlanSectionService();
