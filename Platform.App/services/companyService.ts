import { apiClient } from './api';
import {
    Company,
    CreateCompanyRequest,
    UpdateCompanyRequest,
    CompanyMember,
    SwitchCompanyRequest,
    UserCompany,
} from '../types/company';
import { ApiResponse } from '../types/api';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Company Service
 * Handles company/organization related operations
 */
export const companyService = {
    /**
     * Get current user's company
     */
    async getCurrentCompany(): Promise<ApiResponse<Company>> {
        return await apiClient.get<any, ApiResponse<Company>>('/api/company/current');
    },

    /**
     * Update current company information
     */
    async updateCurrentCompany(
        request: UpdateCompanyRequest
    ): Promise<ApiResponse<Company>> {
        return await apiClient.put<any, ApiResponse<Company>>(
            '/api/company/current',
            request
        );
    },

    /**
     * Create a new company
     */
    async createCompany(request: CreateCompanyRequest): Promise<ApiResponse<Company>> {
        return await apiClient.post<any, ApiResponse<Company>>(
            '/api/company/create',
            request
        );
    },

    /**
     * Get list of companies the user belongs to
     */
    async getMyCompanies(): Promise<ApiResponse<UserCompany[]>> {
        return await apiClient.get<any, ApiResponse<UserCompany[]>>('/api/company/my-companies');
    },

    /**
     * Switch to a different company
     */
    async switchCompany(companyId: string): Promise<ApiResponse<void>> {
        const response = await apiClient.post<any, ApiResponse<void>>(
            '/api/company/switch',
            { targetCompanyId: companyId } as SwitchCompanyRequest
        );

        // Update stored current company ID
        if (response.success) {
            await storage.set(STORAGE_KEYS.CURRENT_COMPANY_ID, companyId);
        }

        return response;
    },

    /**
     * Search companies
     */
    async searchCompanies(keyword: string): Promise<ApiResponse<Company[]>> {
        return await apiClient.get<any, ApiResponse<Company[]>>(
            `/api/company/search?keyword=${encodeURIComponent(keyword)}`
        );
    },

    /**
     * Get company members (admin only)
     */
    async getCompanyMembers(): Promise<ApiResponse<CompanyMember[]>> {
        return await apiClient.get<any, ApiResponse<CompanyMember[]>>(
            '/api/company/members'
        );
    },

    /**
     * Check if company code is available
     */
    async checkCodeAvailability(code: string): Promise<ApiResponse<{ available: boolean }>> {
        return await apiClient.get<any, ApiResponse<{ available: boolean }>>(
            `/api/company/check-code?code=${encodeURIComponent(code)}`
        );
    },
};
