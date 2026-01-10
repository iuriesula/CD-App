import type {
  Dealership,
  User,
  Lead,
  Activity,
  Task,
  Document,
  Email,
  CallLog,
  UserRole,
  LeadStage,
  LeadSource,
  ActivityType,
  TaskType,
  DocumentType,
  DocumentStatus,
  ContractorDepartment,
  RequestStatus,
  RequestPriority,
  Request,
  RequestMessage,
  RequestAttachment,
  ContractorDealershipAccess,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Dealership,
  User,
  Lead,
  Activity,
  Task,
  Document,
  Email,
  CallLog,
  UserRole,
  LeadStage,
  LeadSource,
  ActivityType,
  TaskType,
  DocumentType,
  DocumentStatus,
  ContractorDepartment,
  RequestStatus,
  RequestPriority,
  Request,
  RequestMessage,
  RequestAttachment,
  ContractorDealershipAccess,
};

// Extended types with relations
export type LeadWithRelations = Lead & {
  dealership?: Dealership;
  assignedTo?: User | null;
  activities?: Activity[];
  tasks?: Task[];
};

export type TaskWithRelations = Task & {
  lead: Lead;
  user?: User;
};

export type UserWithDealership = User & {
  dealership?: Dealership | null;
};

export type ContractorWithDealerships = User & {
  contractorDealerships?: (ContractorDealershipAccess & {
    dealership: Dealership;
  })[];
};

export type ContractorWithRelations = User & {
  contractorDealerships: (ContractorDealershipAccess & {
    dealership: Dealership;
  })[];
  requestsAssigned: (Request & {
    dealership: Dealership;
    requestedBy: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    } | null;
  })[];
};

export type RequestWithRelations = Request & {
  dealership: Dealership;
  requestedBy: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
  assignedTo?: User | null;
  messages?: (RequestMessage & {
    user: User;
    attachments: RequestAttachment[];
  })[];
  attachments?: RequestAttachment[];
  _count?: {
    messages: number;
  };
};

// Auth types
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  dealershipId: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  userId: string; // Alias for id - used in some API routes
  email: string;
  name: string;
  role: UserRole;
  dealershipId: string | null;
  mustChangePassword?: boolean;
  contractorDepartment?: ContractorDepartment | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pipeline stage config
export interface StageConfig {
  id: LeadStage;
  label: string;
  winProbability: number;
  autoFollowUp: boolean;
  color: string;
}

export const STAGE_CONFIG: StageConfig[] = [
  { id: "new_lead", label: "New Lead", winProbability: 0.10, autoFollowUp: true, color: "blue" },
  { id: "interested", label: "Interested", winProbability: 0.20, autoFollowUp: false, color: "cyan" },
  { id: "negotiating", label: "Negotiating", winProbability: 0.40, autoFollowUp: false, color: "yellow" },
  { id: "buyers_order_sent", label: "Buyer's Order Sent", winProbability: 0.60, autoFollowUp: false, color: "orange" },
  { id: "buyers_order_signed", label: "Buyer's Order Signed", winProbability: 0.85, autoFollowUp: false, color: "purple" },
  { id: "invoice_sent", label: "Invoice Sent", winProbability: 0.95, autoFollowUp: false, color: "pink" },
  { id: "won_invoice_paid", label: "Won - Paid", winProbability: 1.00, autoFollowUp: false, color: "green" },
  { id: "won_preparing", label: "Won - Preparing", winProbability: 1.00, autoFollowUp: false, color: "green" },
  { id: "won_ready_to_ship", label: "Won - Ready to Ship", winProbability: 1.00, autoFollowUp: false, color: "green" },
  { id: "won_arrived", label: "Won - Arrived", winProbability: 1.00, autoFollowUp: false, color: "green" },
  { id: "lost", label: "Lost", winProbability: 0.00, autoFollowUp: false, color: "red" },
  { id: "lost_unanswered", label: "Lost - Unanswered", winProbability: 0.00, autoFollowUp: false, color: "gray" },
];

export const getStageConfig = (stage: LeadStage): StageConfig => {
  return STAGE_CONFIG.find(s => s.id === stage) ?? STAGE_CONFIG[0];
};

// Follow-up attempt delays (in days)
export const FOLLOW_UP_DELAYS = [1, 2, 3, 3] as const; // After attempt 1->2, 2->3, 3->4, 4->5
export const MAX_ATTEMPTS = 5;
