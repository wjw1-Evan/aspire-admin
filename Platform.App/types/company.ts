/**
 * Company related types
 */

export interface Company {
    id: string;
    name: string;
    code: string;
    description?: string;
    industry?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCompanyRequest {
    name: string;
    code: string;
    description?: string;
    industry?: string;
}

export interface UpdateCompanyRequest {
    name?: string;
    description?: string;
    industry?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
}

export interface CompanyMember {
    userId: string;
    username: string;
    realName?: string;
    email: string;
    roleIds: string[];
    isAdmin: boolean;
    joinedAt: string;
}

export interface SwitchCompanyRequest {
    targetCompanyId: string;
}

export interface UserCompany {
    companyId: string;
    companyName: string;
    companyCode: string;
    isAdmin: boolean;
    isCurrent: boolean;
    isPersonal: boolean;
    joinedAt: string;
    roleNames: string[];
}
