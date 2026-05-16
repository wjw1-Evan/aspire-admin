export interface ServiceRequestDto {
  id: string;
  categoryName?: string;
  tenantId?: string;
  tenantName?: string;
  title: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  completedAt?: string;
  rating?: number;
  createdAt: string;
  attachments?: string[];
  statusHistory?: StatusChangeRecordDto[];
}

export interface StatusChangeRecordDto {
  fromStatus: string;
  toStatus: string;
  changedBy?: string;
  changedByName?: string;
  handledBy?: string;
  comment?: string;
  changedAt: string;
}

export interface ServiceStatisticsResponse {
  totalCategories: number;
  activeCategories: number;
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  averageRating: number;
}

export interface CreateServiceRequestRequest {
  tenantId?: string;
  title?: string;
  description?: string;
  contactPerson?: string;
  contactPhone?: string;
  priority?: string;
  attachments?: string[];
}

export interface UpdateServiceRequestStatusRequest {
  status: string;
  assignedTo?: string;
  resolution?: string;
}

export interface RateServiceRequest {
  rating: number;
  feedback?: string;
}

export interface SuggestCategoryResult {
  categoryName: string;
}

export interface ParkTenant {
  id: string;
  tenantName: string;
  contactPerson?: string;
  phone?: string;
}

export const PRIORITY_OPTIONS = [
  { label: 'priority_urgent', value: 'Urgent', color: '#ef4444' },
  { label: 'priority_high', value: 'High', color: '#f97316' },
  { label: 'priority_normal', value: 'Normal', color: '#3b82f6' },
  { label: 'priority_low', value: 'Low', color: '#6b7280' },
] as const;

export const STATUS_OPTIONS = [
  { label: 'status_pending', value: 'Pending', color: '#f97316' },
  { label: 'status_processing', value: 'Processing', color: '#3b82f6' },
  { label: 'status_completed', value: 'Completed', color: '#10b981' },
  { label: 'status_cancelled', value: 'Cancelled', color: '#6b7280' },
] as const;

export function getPriorityInfo(value: string) {
  return PRIORITY_OPTIONS.find((o) => o.value === value) || PRIORITY_OPTIONS[2];
}

export function getStatusInfo(value: string) {
  return STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0];
}
