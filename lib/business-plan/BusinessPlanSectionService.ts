import { Prisma, BusinessPlanSectionKey } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateSectionInput = {
    key: BusinessPlanSectionKey;
    content: Prisma.InputJsonValue;
};

export const BUSINESS_PLAN_TEMPLATE_KEYS = [
    BusinessPlanSectionKey.EXECUTIVE_SUMMARY,
    BusinessPlanSectionKey.PROBLEM,
    BusinessPlanSectionKey.SOLUTION,
    BusinessPlanSectionKey.MARKET,
    BusinessPlanSectionKey.COMPETITION,
    BusinessPlanSectionKey.GO_TO_MARKET,
    BusinessPlanSectionKey.OPERATIONS,
    BusinessPlanSectionKey.FINANCIALS,
    BusinessPlanSectionKey.RISKS,
] as const;

export class SectionConflictError extends Error {
    code = "SECTION_CONFLICT" as const;
}

export class InvalidSectionError extends Error {
    code = "INVALID_SECTION" as const;
}

export class SectionNotFoundError extends Error {
    code = "SECTION_NOT_FOUND" as const;
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

        return prisma.$transaction((tx) =>
            this.createSectionsWithTx(tx, businessPlanId, sections)
        ).catch((error) => {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new SectionConflictError("Section already exists");
            }
            throw error;
        });
    }

    async seedTemplate(businessPlanId: string) {
        const sections = BUSINESS_PLAN_TEMPLATE_KEYS.map((key) => ({
            key,
            content: {},
        }));
        return this.createSections(businessPlanId, sections);
    }

    async seedTemplateWithTx(tx: Prisma.TransactionClient, businessPlanId: string) {
        const sections = BUSINESS_PLAN_TEMPLATE_KEYS.map((key) => ({
            key,
            content: {},
        }));
        return this.createSectionsWithTx(tx, businessPlanId, sections);
    }

    async updateSection(
        businessPlanId: string,
        key: BusinessPlanSectionKey,
        content: Prisma.InputJsonValue
    ) {
        if (!content || typeof content !== "object") {
            throw new InvalidSectionError("Contenido inválido");
        }

        return prisma.$transaction(async (tx) => {
            const existing = await tx.businessPlanSection.findFirst({
                where: { businessPlanId, key },
                select: { id: true },
            });

            if (!existing) {
                throw new SectionNotFoundError("Section not found");
            }

            return tx.businessPlanSection.update({
                where: {
                    businessPlanId_key: {
                        businessPlanId,
                        key,
                    },
                },
                data: {
                    content,
                },
                select: { id: true, key: true, content: true },
            });
        });
    }

    async updateSectionsBatch(
        businessPlanId: string,
        updates: Array<{ key: BusinessPlanSectionKey; content: Prisma.InputJsonValue }>
    ) {
        if (!updates.length) {
            throw new InvalidSectionError("Updates required");
        }
        const keys = updates.map((update) => update.key);
        const invalidKeys = keys.filter(
            (key) => !BUSINESS_PLAN_TEMPLATE_KEYS.includes(key)
        );
        if (invalidKeys.length) {
            throw new SectionNotFoundError("Section not found");
        }
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
            if (existing.length !== keys.length) {
                throw new SectionNotFoundError("Section not found");
            }

            const updated = await Promise.all(
                updates.map((update) =>
                    tx.businessPlanSection.update({
                        where: {
                            businessPlanId_key: {
                                businessPlanId,
                                key: update.key,
                            },
                        },
                        data: {
                            content: update.content,
                        },
                        select: { id: true, key: true, content: true },
                    })
                )
            );

            return updated;
        });
    }

    private async createSectionsWithTx(
        tx: Prisma.TransactionClient,
        businessPlanId: string,
        sections: CreateSectionInput[]
    ) {
        if (!sections.length) {
            throw new InvalidSectionError("Sections required");
        }

        const keys = sections.map((section) => section.key);
        const uniqueKeys = new Set(keys);
        if (uniqueKeys.size !== keys.length) {
            throw new InvalidSectionError("Duplicate keys in request");
        }

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
    }
}

export const businessPlanSectionService = new BusinessPlanSectionService();
