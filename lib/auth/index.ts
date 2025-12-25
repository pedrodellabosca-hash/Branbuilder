import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import type { OrgRole, ProjectRole } from '@prisma/client'

/**
 * Get the current authenticated user with organization context
 */
export async function getCurrentUser() {
    const user = await currentUser()
    if (!user) return null

    return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
    }
}

/**
 * Get the current organization ID from Clerk auth
 */
export async function getActiveOrgId(): Promise<string | null> {
    const { orgId } = await auth()
    return orgId ?? null
}

/**
 * Get the organization from DB by Clerk org ID
 */
export async function getOrganization(clerkOrgId: string) {
    return prisma.organization.findUnique({
        where: { clerkOrgId },
    })
}

/**
 * Get user's role in an organization
 */
export async function getOrgRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const member = await prisma.orgMember.findUnique({
        where: {
            orgId_userId: { orgId, userId }
        },
        select: { role: true }
    })
    return member?.role ?? null
}

/**
 * Get user's role in a project
 */
export async function getProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId }
        },
        select: { role: true }
    })
    return member?.role ?? null
}

/**
 * Check if user has at least the required org role
 */
export function hasOrgRole(userRole: OrgRole | null, requiredRole: OrgRole): boolean {
    if (!userRole) return false

    const roleHierarchy: Record<OrgRole, number> = {
        OWNER: 3,
        ADMIN: 2,
        MEMBER: 1,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user has at least the required project role
 */
export function hasProjectRole(userRole: ProjectRole | null, requiredRole: ProjectRole): boolean {
    if (!userRole) return false

    const roleHierarchy: Record<ProjectRole, number> = {
        PROJECT_OWNER: 3,
        EDITOR: 2,
        VIEWER: 1,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}

/**
 * Require organization context - throws if no org selected
 */
export async function requireOrg() {
    const [user, clerkOrgId] = await Promise.all([
        getCurrentUser(),
        getActiveOrgId()
    ])

    if (!user) {
        throw new Error('Unauthorized')
    }

    if (!clerkOrgId) {
        throw new Error('No organization selected')
    }

    const org = await getOrganization(clerkOrgId)
    if (!org) {
        throw new Error('Organization not found')
    }

    const role = await getOrgRole(org.id, user.id)
    if (!role) {
        throw new Error('Not a member of this organization')
    }

    return { user, org, role }
}

/**
 * Require project access - throws if no access
 */
export async function requireProjectAccess(projectId: string, minRole: ProjectRole = 'VIEWER') {
    const { user, org, role: orgRole } = await requireOrg()

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            orgId: org.id, // Multi-tenant isolation
        }
    })

    if (!project) {
        throw new Error('Project not found')
    }

    // Org owners and admins have full access to all projects
    if (orgRole === 'OWNER' || orgRole === 'ADMIN') {
        return { user, org, project, projectRole: 'PROJECT_OWNER' as ProjectRole }
    }

    // Check project-specific role
    const projectRole = await getProjectRole(projectId, user.id)
    if (!hasProjectRole(projectRole, minRole)) {
        throw new Error('Insufficient permissions')
    }

    return { user, org, project, projectRole: projectRole! }
}
