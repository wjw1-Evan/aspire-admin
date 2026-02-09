import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

export enum ProjectStatisticsPeriod {
    Day = 0,
    Week = 1,
    Month = 2,
    Quarter = 3,
    Year = 4,
    Custom = 5,
}

export interface ProjectStatistics {
    totalProjects: number;
    inProgressProjects: number;
    completedProjects: number;
    delayedProjects: number;
    projectsByStatus: Record<string, number>;
    projectsByPriority: Record<string, number>;
}

export interface TaskStatistics {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    failedTasks: number;
    overdueTasks: number;
    completionRate: number;
    tasksByPriority: Record<string, number>;
    tasksByStatus: Record<string, number>;
}

export interface ProjectMemberStatistics {
    totalMembers: number;
    membersByRole: Record<string, number>;
}

export interface MilestoneStatistics {
    totalMilestones: number;
    pendingMilestones: number;
    achievedMilestones: number;
    delayedMilestones: number;
}

export interface ProjectDashboardStatistics {
    project: ProjectStatistics;
    task: TaskStatistics;
    member: ProjectMemberStatistics;
    milestone: MilestoneStatistics;
}

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStatistics(
    period?: ProjectStatisticsPeriod,
    startDate?: string,
    endDate?: string
) {
    return request<ApiResponse<ProjectDashboardStatistics>>('/api/project/statistics/dashboard', {
        method: 'GET',
        params: { period, startDate, endDate },
    });
}

/**
 * 生成 AI 统计报告
 */
export async function generateAiReport(
    period?: ProjectStatisticsPeriod,
    startDate?: string,
    endDate?: string,
    data?: any
) {
    return request<ApiResponse<string>>('/api/project/statistics/ai-report', {
        method: 'POST',
        params: { period, startDate, endDate },
        data,
    });
}
