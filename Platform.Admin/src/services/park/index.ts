import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export enum StatisticsPeriod {
    Day = 0,
    Week = 1,
    Month = 2,
    Year = 3,
    Custom = 4,
}

// ... (rest of the file until getAssetStatistics)

// Statistics
export async function getAssetStatistics(period?: StatisticsPeriod, startDate?: string, endDate?: string) {
    return request<ApiResponse<AssetStatistics>>('/api/park/asset/statistics', {
        method: 'GET',
        params: { period, startDate, endDate },
    });
}

// ... (rest of the file until getInvestmentStatistics)

export async function getInvestmentStatistics(period?: StatisticsPeriod, startDate?: string, endDate?: string) {
    return request<ApiResponse<InvestmentStatistics>>('/api/park/investment/statistics', {
        method: 'GET',
        params: { period, startDate, endDate },
    });
}

// ... (rest of the file until getTenantStatistics)

export async function getTenantStatistics(period?: StatisticsPeriod, startDate?: string, endDate?: string) {
    return request<ApiResponse<TenantStatistics>>('/api/park/tenant/statistics', {
        method: 'GET',
        params: { period, startDate, endDate },
    });
}

// ... (rest of the file until getServiceStatistics)

export async function getServiceStatistics(period?: StatisticsPeriod, startDate?: string, endDate?: string) {
    return request<ApiResponse<ServiceStatistics>>('/api/park/services/statistics', {
        method: 'GET',
        params: { period, startDate, endDate },
    });
}

export async function generateAiReport(period?: StatisticsPeriod, startDate?: string, endDate?: string, data?: any) {
    return request<ApiResponse<string>>('/api/park/statistics/ai-report', {
        method: 'POST',
        params: { period, startDate, endDate },
        data,
    });
}

// ===== 资产管理 API =====

export interface Building {
    id: string;
    name: string;
    address?: string;
    totalFloors: number;
    totalArea: number;
    rentedArea: number;
    occupancyRate: number;
    buildingType?: string;
    yearBuilt: number;
    deliveryDate?: string;
    status: string;
    description?: string;
    coverImage?: string;
    totalUnits: number;
    availableUnits: number;
    createdAt: string;
    attachments?: string[];
}

export interface PropertyUnit {
    id: string;
    buildingId: string;
    buildingName?: string;
    unitNumber: string;
    floor: number;
    area: number;
    monthlyRent: number;
    dailyRent?: number;
    unitType: string;
    description?: string;
    status: string;
    currentTenantId?: string;
    currentTenantName?: string;
    leaseEndDate?: string;
    facilities?: string[];
    images?: string[];
    attachments?: string[];
    leaseHistory?: LeaseContract[];
}

export interface AssetStatistics {
    totalBuildings: number;
    totalArea: number;
    totalUnits: number;
    availableUnits: number;
    rentedUnits: number;
    occupancyRate: number;
    totalRentableArea: number;
    rentedArea: number;
    occupancyRateYoY?: number;
    occupancyRateMoM?: number;
    totalBuildingsYoY?: number;
    totalBuildingsMoM?: number;
}

export interface BuildingListRequest {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    buildingType?: string;
    sortBy?: string;
    sortOrder?: string;
}

export interface PropertyUnitListRequest {
    page: number;
    pageSize: number;
    buildingId?: string;
    search?: string;
    status?: string;
    unitType?: string;
    floor?: number;
    sortBy?: string;
    sortOrder?: string;
}

// Buildings
export async function getBuildings(params: BuildingListRequest) {
    return request<ApiResponse<{ buildings: Building[]; total: number }>>('/api/park/buildings/list', {
        method: 'POST',
        data: params,
    });
}

export async function getBuilding(id: string) {
    return request<ApiResponse<Building>>(`/api/park/buildings/${id}`, { method: 'GET' });
}

export async function createBuilding(data: Partial<Building>) {
    return request<ApiResponse<Building>>('/api/park/buildings', { method: 'POST', data });
}

export async function updateBuilding(id: string, data: Partial<Building>) {
    return request<ApiResponse<Building>>(`/api/park/buildings/${id}`, { method: 'PUT', data });
}

export async function deleteBuilding(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/buildings/${id}`, { method: 'DELETE' });
}

// Property Units
export async function getPropertyUnits(params: PropertyUnitListRequest) {
    return request<ApiResponse<{ units: PropertyUnit[]; total: number }>>('/api/park/properties/list', {
        method: 'POST',
        data: params,
    });
}

export async function getPropertyUnit(id: string) {
    return request<ApiResponse<PropertyUnit>>(`/api/park/properties/${id}`, { method: 'GET' });
}

export async function createPropertyUnit(data: Partial<PropertyUnit>) {
    return request<ApiResponse<PropertyUnit>>('/api/park/properties', { method: 'POST', data });
}

export async function updatePropertyUnit(id: string, data: Partial<PropertyUnit>) {
    return request<ApiResponse<PropertyUnit>>(`/api/park/properties/${id}`, { method: 'PUT', data });
}

export async function deletePropertyUnit(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/properties/${id}`, { method: 'DELETE' });
}



// ===== 招商管理 API =====

export interface InvestmentLead {
    id: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    industry?: string;
    source: string;
    intendedArea?: number;
    status: string;
    priority: string;
    assignedTo?: string;
    assignedToName?: string;
    nextFollowUpDate?: string;
    createdAt: string;
}

export interface InvestmentProject {
    id: string;
    leadId?: string;
    projectName: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    intendedArea?: number;
    proposedRent?: number;
    stage: string;
    expectedSignDate?: string;
    probability?: number;
    assignedTo?: string;
    assignedToName?: string;
    createdAt: string;
}

export interface InvestmentStatistics {
    totalLeads: number;
    newLeadsThisMonth: number;
    totalProjects: number;
    projectsInNegotiation: number;
    signedProjects: number;
    conversionRate: number;
    leadsByStatus: Record<string, number>;
    projectsByStage: Record<string, number>;
    totalLeadsYoY?: number;
    newLeadsMoM?: number;
    conversionRateYoY?: number;
}

export interface LeadListRequest {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    source?: string;
    priority?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: string;
}

export interface ProjectListRequest {
    page: number;
    pageSize: number;
    search?: string;
    stage?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: string;
}

// Leads
export async function getLeads(params: LeadListRequest) {
    return request<ApiResponse<{ leads: InvestmentLead[]; total: number }>>('/api/park/investment/leads/list', {
        method: 'POST',
        data: params,
    });
}

export async function createLead(data: Partial<InvestmentLead>) {
    return request<ApiResponse<InvestmentLead>>('/api/park/investment/leads', { method: 'POST', data });
}

export async function updateLead(id: string, data: Partial<InvestmentLead>) {
    return request<ApiResponse<InvestmentLead>>(`/api/park/investment/leads/${id}`, { method: 'PUT', data });
}

export async function deleteLead(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/investment/leads/${id}`, { method: 'DELETE' });
}

export async function convertLeadToProject(id: string) {
    return request<ApiResponse<InvestmentProject>>(`/api/park/investment/leads/${id}/convert`, { method: 'POST' });
}

// Projects
export async function getProjects(params: ProjectListRequest) {
    return request<ApiResponse<{ projects: InvestmentProject[]; total: number }>>('/api/park/investment/projects/list', {
        method: 'POST',
        data: params,
    });
}

export async function createProject(data: Partial<InvestmentProject>) {
    return request<ApiResponse<InvestmentProject>>('/api/park/investment/projects', { method: 'POST', data });
}

export async function updateProject(id: string, data: Partial<InvestmentProject>) {
    return request<ApiResponse<InvestmentProject>>(`/api/park/investment/projects/${id}`, { method: 'PUT', data });
}

export async function deleteProject(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/investment/projects/${id}`, { method: 'DELETE' });
}



// ===== 租户管理 API =====

export interface ParkTenant {
    id: string;
    tenantName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    industry?: string;
    status: string;
    entryDate?: string;
    unitCount: number;
    totalArea: number;
    activeContracts: number;
    createdAt: string;
}

export interface LeaseContract {
    id: string;
    tenantId: string;
    tenantName?: string;
    contractNumber: string;
    unitIds: string[];
    unitNumbers?: string[];
    startDate: string;
    endDate: string;
    monthlyRent: number;
    rentalPricingMethod?: string;
    unitPrice?: number;
    deposit?: number;
    propertyFee?: number;
    totalAmount?: number;
    paymentCycle: string;
    status: string;
    daysUntilExpiry: number;
    terms?: string;
    paymentDay?: number;
    attachments?: string[];
    paymentRecords?: LeasePaymentRecord[];
    createdAt: string;
}

export interface LeasePaymentRecord {
    id: string;
    contractId: string;
    tenantId: string;
    amount: number;
    paymentType?: string;
    paymentDate: string;
    paymentMethod?: string;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
    handledBy?: string;
    createdAt: string;
}

export interface CreateLeasePaymentRecordRequest {
    contractId: string;
    amount: number;
    paymentType: string;
    paymentDate: string;
    paymentMethod?: string;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
}

export interface TenantStatistics {
    totalTenants: number;
    activeTenants: number;
    totalContracts: number;
    activeContracts: number;
    expiringContracts: number;
    totalMonthlyRent: number;
    tenantsByIndustry: Record<string, number>;
    totalReceived: number;
    totalExpected: number;
    collectionRate: number;
    receivedByPaymentType: Record<string, number>;
    totalContractAmount: number;
    totalTenantsYoY?: number;
    activeTenantsMoM?: number;
    rentIncomeYoY?: number;
    rentIncomeMoM?: number;
    monthlyRentYoY?: number;
    monthlyRentMoM?: number;
    activeTenantsYoY?: number;
    yearlyEstimate?: number;
    rentIncome?: number;
}

export interface TenantListRequest {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    industry?: string;
    sortBy?: string;
    sortOrder?: string;
}

export interface ContractListRequest {
    page: number;
    pageSize: number;
    tenantId?: string;
    search?: string;
    status?: string;
    expiringWithin30Days?: boolean;
    sortBy?: string;
    sortOrder?: string;
}

// Tenants
export async function getTenants(params: TenantListRequest) {
    return request<ApiResponse<{ tenants: ParkTenant[]; total: number }>>('/api/park/tenants/list', {
        method: 'POST',
        data: params,
    });
}

export async function getTenant(id: string) {
    return request<ApiResponse<ParkTenant>>(`/api/park/tenants/${id}`, { method: 'GET' });
}

export async function createTenant(data: Partial<ParkTenant>) {
    return request<ApiResponse<ParkTenant>>('/api/park/tenants', { method: 'POST', data });
}

export async function updateTenant(id: string, data: Partial<ParkTenant>) {
    return request<ApiResponse<ParkTenant>>(`/api/park/tenants/${id}`, { method: 'PUT', data });
}

export async function deleteTenant(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/tenants/${id}`, { method: 'DELETE' });
}

// Contracts
export async function getContracts(params: ContractListRequest) {
    return request<ApiResponse<{ contracts: LeaseContract[]; total: number }>>('/api/park/contracts/list', {
        method: 'POST',
        data: params,
    });
}

export async function createContract(data: Partial<LeaseContract>) {
    return request<ApiResponse<LeaseContract>>('/api/park/contracts', { method: 'POST', data });
}

export async function getContract(id: string) {
    return request<ApiResponse<LeaseContract>>(`/api/park/contracts/${id}`, { method: 'GET' });
}

export async function updateContract(id: string, data: Partial<LeaseContract>) {
    return request<ApiResponse<LeaseContract>>(`/api/park/contracts/${id}`, { method: 'PUT', data });
}

export async function deleteContract(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/contracts/${id}`, { method: 'DELETE' });
}

export async function renewContract(id: string, data: Partial<LeaseContract>) {
    return request<ApiResponse<LeaseContract>>(`/api/park/contracts/${id}/renew`, { method: 'POST', data });
}

export async function createPaymentRecord(data: CreateLeasePaymentRecordRequest) {
    return request<ApiResponse<LeasePaymentRecord>>('/api/park/contracts/payments', { method: 'POST', data });
}

export async function getPaymentRecords(contractId: string) {
    return request<ApiResponse<LeasePaymentRecord[]>>(`/api/park/contracts/${contractId}/payments`, { method: 'GET' });
}

export async function deletePaymentRecord(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/contracts/payments/${id}`, { method: 'DELETE' });
}



// ===== 企业服务 API =====

export interface ServiceCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder: number;
    isActive: boolean;
    requestCount: number;
}

export interface ServiceRequest {
    id: string;
    categoryId: string;
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
}

export interface ServiceStatistics {
    totalCategories: number;
    activeCategories: number;
    totalRequests: number;
    pendingRequests: number;
    processingRequests: number;
    completedRequests: number;
    averageRating: number;
    requestsByCategory: Record<string, number>;
    requestsByStatus: Record<string, number>;
    totalRequestsYoY?: number;
    totalRequestsMoM?: number;
    averageRatingYoY?: number;
}

export interface ServiceRequestListRequest {
    page: number;
    pageSize: number;
    categoryId?: string;
    tenantId?: string;
    search?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: string;
}

// Categories
export async function getServiceCategories() {
    return request<ApiResponse<{ categories: ServiceCategory[] }>>('/api/park/services/categories', { method: 'GET' });
}

export async function createServiceCategory(data: Partial<ServiceCategory>) {
    return request<ApiResponse<ServiceCategory>>('/api/park/services/categories', { method: 'POST', data });
}

export async function updateServiceCategory(id: string, data: Partial<ServiceCategory>) {
    return request<ApiResponse<ServiceCategory>>(`/api/park/services/categories/${id}`, { method: 'PUT', data });
}

export async function deleteServiceCategory(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/services/categories/${id}`, { method: 'DELETE' });
}

export async function toggleServiceCategoryStatus(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/services/categories/${id}/toggle`, { method: 'PUT' });
}

// Service Requests
export async function getServiceRequests(params: ServiceRequestListRequest) {
    return request<ApiResponse<{ requests: ServiceRequest[]; total: number }>>('/api/park/services/requests/list', {
        method: 'POST',
        data: params,
    });
}

export async function getServiceRequest(id: string) {
    return request<ApiResponse<ServiceRequest>>(`/api/park/services/requests/${id}`, { method: 'GET' });
}

export async function createServiceRequest(data: Partial<ServiceRequest>) {
    return request<ApiResponse<ServiceRequest>>('/api/park/services/requests', { method: 'POST', data });
}

export async function updateServiceRequestStatus(id: string, data: { status: string; assignedTo?: string; resolution?: string }) {
    return request<ApiResponse<ServiceRequest>>(`/api/park/services/requests/${id}/status`, { method: 'PUT', data });
}

export async function deleteServiceRequest(id: string) {
    return request<ApiResponse<boolean>>(`/api/park/services/requests/${id}`, { method: 'DELETE' });
}

export async function rateServiceRequest(id: string, data: { rating: number; feedback?: string }) {
    return request<ApiResponse<boolean>>(`/api/park/services/requests/${id}/rate`, { method: 'POST', data });
}


