import { ContractorDepartment, UserRole } from "@prisma/client";
import prisma from "@/lib/db";

/**
 * Permission system for contractor access control
 */

// Define what each contractor department can access
export const CONTRACTOR_PERMISSIONS = {
  it: [
    "settings",
    "users",
    "media",
    "email",
    "inventory",
    "dealership_config",
  ],
  content: ["media", "inventory"],
  marketing: ["leads", "email_templates", "media"],
} as const;

/**
 * Check if a contractor department has permission to access a specific resource
 */
export function contractorHasPermission(
  department: ContractorDepartment,
  resource: string
): boolean {
  const permissions = CONTRACTOR_PERMISSIONS[department];
  return permissions.includes(resource as any);
}

/**
 * Verify that a contractor has access to a specific dealership
 * Returns true if the contractor is assigned to this dealership
 */
export async function contractorHasDealershipAccess(
  contractorId: string,
  dealershipId: string
): Promise<boolean> {
  const access = await prisma.contractorDealershipAccess.findUnique({
    where: {
      contractorId_dealershipId: {
        contractorId,
        dealershipId,
      },
    },
  });

  return !!access;
}

/**
 * Get all dealerships a contractor has access to
 */
export async function getContractorDealerships(
  contractorId: string
): Promise<string[]> {
  const accesses = await prisma.contractorDealershipAccess.findMany({
    where: { contractorId },
    select: { dealershipId: true },
  });

  return accesses.map((a) => a.dealershipId);
}

/**
 * Check if a user can manage contractors (only agency_admin)
 */
export function canManageContractors(role: UserRole): boolean {
  return role === "agency_admin";
}

/**
 * Check if a user can create requests (dealership users)
 */
export function canCreateRequests(role: UserRole): boolean {
  return ["salesperson", "manager", "tech", "content_creator"].includes(role);
}

/**
 * Check if a user can view a specific request
 * - Request creator can view
 * - Contractors in the same department can view
 * - Assigned contractor can view
 * - Dealership managers can view
 */
export async function canViewRequest(
  userId: string,
  userRole: UserRole,
  userDealershipId: string | null,
  contractorDepartment: ContractorDepartment | null,
  requestId: string
): Promise<boolean> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      dealershipId: true,
      department: true,
      requestedById: true,
      assignedToId: true,
    },
  });

  if (!request) return false;

  // Agency admin can view all requests
  if (userRole === "agency_admin") return true;

  // Request creator can view
  if (request.requestedById === userId) return true;

  // Assigned contractor can view
  if (request.assignedToId === userId) return true;

  // Dealership users (salesperson, manager, tech, content_creator) can view their dealership's requests
  if (userDealershipId && userDealershipId === request.dealershipId) {
    return true;
  }

  // Contractors can view requests in their department
  if (userRole === "contractor" && contractorDepartment === request.department) {
    // Verify contractor has access to this dealership
    return await contractorHasDealershipAccess(userId, request.dealershipId);
  }

  return false;
}

/**
 * Check if a user can update a request's status
 */
export async function canUpdateRequestStatus(
  userId: string,
  userRole: UserRole,
  requestId: string
): Promise<boolean> {
  // Get user's contractor department if applicable
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dealershipId: true,
      contractorDepartment: true
    },
  });

  // Use the same permission logic as viewing
  // If you can view the request, you can update its status
  return await canViewRequest(
    userId,
    userRole,
    user?.dealershipId || null,
    user?.contractorDepartment || null,
    requestId
  );
}

/**
 * Check if a user can assign a request to a contractor
 */
export function canAssignRequest(role: UserRole): boolean {
  return role === "manager" || role === "agency_admin";
}

/**
 * Validate that a contractor can be assigned to a request
 * Contractor must:
 * 1. Be a contractor role
 * 2. Have the matching department
 * 3. Have access to the request's dealership
 */
export async function canContractorBeAssigned(
  contractorId: string,
  requestId: string
): Promise<{ valid: boolean; error?: string }> {
  const contractor = await prisma.user.findUnique({
    where: { id: contractorId },
    select: {
      role: true,
      contractorDepartment: true,
      isActive: true,
    },
  });

  if (!contractor) {
    return { valid: false, error: "Contractor not found" };
  }

  if (contractor.role !== "contractor") {
    return { valid: false, error: "User is not a contractor" };
  }

  if (!contractor.isActive) {
    return { valid: false, error: "Contractor is inactive" };
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      department: true,
      dealershipId: true,
    },
  });

  if (!request) {
    return { valid: false, error: "Request not found" };
  }

  if (contractor.contractorDepartment !== request.department) {
    return {
      valid: false,
      error: "Contractor department does not match request department",
    };
  }

  const hasAccess = await contractorHasDealershipAccess(
    contractorId,
    request.dealershipId
  );

  if (!hasAccess) {
    return {
      valid: false,
      error: "Contractor does not have access to this dealership",
    };
  }

  return { valid: true };
}
