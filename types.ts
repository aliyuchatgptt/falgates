
export enum DistributionUnit {
  PLATFORM_A = 'PLATFORM_A',
  PLATFORM_B = 'PLATFORM_B',
  PLATFORM_C = 'PLATFORM_C',
  LOADING_DOCK_1 = 'LOADING_DOCK_1',
  PACKAGING_ZONE = 'PACKAGING_ZONE',
}

export interface StaffMember {
  id: string; // Unique ID (e.g., FG0001)
  fullName: string;
  assignedUnit: DistributionUnit;
  registeredAt: number;
  faceEmbedding: number[]; // Mocked vector for local persistence structure
  referenceImageBase64: string; // Stored for visual comparison
}

export interface CheckInLog {
  id?: number; // Auto-incremented by DB
  staffId: string;
  staffName: string;
  assignedUnit: DistributionUnit;
  timestamp: number;
  confidenceScore: number;
}

export interface RecognitionResult {
  isMatch: boolean;
  confidence: number;
  staffMember?: StaffMember;
  message?: string;
}

export enum AppRoute {
  KIOSK = 'KIOSK',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ENROLLMENT = 'ENROLLMENT',
  ANALYSIS = 'ANALYSIS',
  API_CONFIG = 'API_CONFIG',
}
