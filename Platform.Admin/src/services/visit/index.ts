import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export enum StatisticsPeriod {
    Day = 0,
    Week = 1,
    Month = 2,
    Quarter = 3,
    Year = 4,
    Custom = 5,
}

export interface VisitTask {
    id: string;
    title: string;
    managerName: string;
    phone: string;
    visitType: string;
    visitMethod: string;
    details?: string;
    tenantId?: string;
    tenantName?: string;
    visitLocation?: string;
    visitDate?: string;
    visitor?: string;
    status: string;
    intervieweeName?: string;
    intervieweePosition?: string;
    content?: string;
    photos?: string[];
    feedback?: string;
    createdAt: string;
    assessmentScore?: number;
    assessmentId?: string;
}

export interface VisitAssessment {
    id: string;
    taskId: string;
    visitorName: string;
    phone: string;
    location: string;
    taskDescription: string;
    score: number;
    comments?: string;
    createdAt: string;
}
export interface CreateVisitTaskRequest {
    title: string;
    managerName: string;
    phone: string;
    visitType: string;
    visitMethod: string;
    details?: string;
    tenantId?: string;
    tenantName?: string;
    visitLocation?: string;
    visitDate?: string;
    questionnaireId?: string;
    visitor?: string;
    status?: string;
    intervieweeName?: string;
    intervieweePosition?: string;
    intervieweePhone?: string;
    content?: string;
    photos?: string[];
    attachments?: string[];
    feedback?: string;
}

export interface VisitQuestion {
    id: string;
    content: string;
    category?: string;
    answer?: string;
    isFrequentlyUsed: boolean;
    sortOrder: number;
}

export interface VisitQuestionnaire {
    id: string;
    title: string;
    purpose?: string;
    questionIds: string[];
    questionCount: number;
    createdAt: string;
    sortOrder: number;
}

export interface VisitTaskListRequest {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    visitType?: string;
    managerName?: string;
    tenantId?: string;
    sortBy?: string;
    sortOrder?: string;
}

export interface VisitAssessmentListRequest {
    page: number;
    pageSize: number;
    search?: string;
}

export interface VisitQuestionListRequest {
    page: number;
    pageSize: number;
    search?: string;
    category?: string;
}

export interface VisitStatistics {
    pendingTasks: number;
    completedTasksThisMonth: number;
    activeManagers: number;
    completionRate: number;
    totalAssessments: number;
    averageScore: number;
    tasksByType: Record<string, number>;
    tasksByStatus: Record<string, number>;
    managerRanking: Record<string, number>;
    monthlyTrends: Record<string, number>;
}

// Tasks
export async function getTasks(params: VisitTaskListRequest) {
    return request<ApiResponse<{ tasks: VisitTask[]; total: number }>>('/api/park-management/visit/tasks', {
        method: 'GET',
        params,
    });
}

export async function getTask(id: string) {
    return request<ApiResponse<VisitTask>>(`/api/park-management/visit/task/${id}`, { method: 'GET' });
}

export async function createTask(data: any) {
    return request<ApiResponse<VisitTask>>('/api/park-management/visit/task', { method: 'POST', data });
}

export async function updateTask(id: string, data: any) {
    return request<ApiResponse<VisitTask>>(`/api/park-management/visit/task/${id}`, { method: 'PUT', data });
}

export async function deleteTask(id: string) {
    return request<ApiResponse<boolean>>(`/api/park-management/visit/task/${id}`, { method: 'DELETE' });
}



// Assessments
export async function getAssessments(params: VisitAssessmentListRequest) {
    return request<ApiResponse<{ assessments: VisitAssessment[]; total: number }>>('/api/park-management/visit/assessments', {
        method: 'GET',
        params,
    });
}

export async function createAssessment(data: any) {
    return request<ApiResponse<VisitAssessment>>('/api/park-management/visit/assessment', { method: 'POST', data });
}

// Knowledge Base
export async function getQuestions(params: VisitQuestionListRequest) {
    return request<ApiResponse<{ questions: VisitQuestion[]; total: number }>>('/api/park-management/visit/questions', {
        method: 'GET',
        params,
    });
}

export async function createQuestion(data: any) {
    return request<ApiResponse<VisitQuestion>>('/api/park-management/visit/question', { method: 'POST', data });
}

export async function updateQuestion(id: string, data: any) {
    return request<ApiResponse<VisitQuestion>>(`/api/park-management/visit/question/${id}`, { method: 'PUT', data });
}

export async function deleteQuestion(id: string) {
    return request<ApiResponse<boolean>>(`/api/park-management/visit/question/${id}`, { method: 'DELETE' });
}

export async function getQuestionnaires() {
    return request<ApiResponse<{ questionnaires: VisitQuestionnaire[]; total: number }>>('/api/park-management/visit/questionnaires', {
        method: 'GET',
    });
}

export async function createQuestionnaire(data: any) {
    return request<ApiResponse<VisitQuestionnaire>>('/api/park-management/visit/questionnaire', { method: 'POST', data });
}

export async function updateQuestionnaire(id: string, data: any) {
    return request<ApiResponse<VisitQuestionnaire>>(`/api/park-management/visit/questionnaire/${id}`, { method: 'PUT', data });
}

export async function deleteQuestionnaire(id: string) {
    return request<ApiResponse<boolean>>(`/api/park-management/visit/questionnaire/${id}`, { method: 'DELETE' });
}

// Statistics
export async function getVisitStatistics(startDate?: string, endDate?: string) {
    return request<ApiResponse<VisitStatistics>>('/api/park-management/visit/statistics', {
        method: 'GET',
        params: { startDate, endDate },
    });
}

export async function generateVisitAiReport(data: VisitStatistics) {
    return request<ApiResponse<string>>('/api/park-management/visit/statistics/ai-report', {
        method: 'POST',
        data,
        timeout: 120000,
    });
}
