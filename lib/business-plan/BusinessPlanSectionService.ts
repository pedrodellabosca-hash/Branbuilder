import { Prisma, BusinessPlanSectionKey } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateSectionInput = {
    key: BusinessPlanSectionKey;
    content: Record<string, unknown>;
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

    async seedTemplate(businessPlanId: string) {
        const sections = BUSINESS_PLAN_TEMPLATE_KEYS.map((key) => ({
            key,
            content: {},
        }));
        return this.createSections(businessPlanId, sections);
    }
}

export const businessPlanSectionService = new BusinessPlanSectionService();
