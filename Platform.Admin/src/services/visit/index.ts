import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export interface VisitTask {
    id: string;
    managerName: string;
    phone: string;
    jurisdiction?: string;
    details?: string;
    tenantId?: string;
    tenantName?: string;
    visitLocation?: string;
    visitDate?: string;
    status: string;
    createdAt: string;
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

export interface VisitQuestion {
    id: string;
    content: string;
    category?: string;
    answer?: string;
    isFrequentlyUsed: boolean;
}

export interface VisitQuestionnaire {
    id: string;
    title: string;
    purpose?: string;
    questionIds: string[];
    questionCount: number;
    createdAt: string;
}

export interface VisitTaskListRequest {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
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
    totalAssessments?: number;
    averageScore?: number;
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

export async function dispatchTask(id: string) {
    return request<ApiResponse<VisitTask>>(`/api/park-management/visit/task/${id}/dispatch`, { method: 'POST' });
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

// Statistics
export async function getVisitStatistics() {
    return request<ApiResponse<VisitStatistics>>('/api/park-management/visit/statistics', {
        method: 'GET',
    });
}
