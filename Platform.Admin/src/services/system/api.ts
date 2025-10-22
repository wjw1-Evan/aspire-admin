import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

type HealthStatus = 'healthy' | 'warning' | 'error';

export interface SystemStatus {
  status: HealthStatus;
  message: string;
  timestamp: string;
  services?: {
    database: HealthStatus;
    api: HealthStatus;
    auth: HealthStatus;
  };
}

export interface SystemResources {
  memory: {
    processMemoryMB: number;
    totalMemoryMB: number;
    availableMemoryMB: number;
    usagePercent: number;
    processUsagePercent?: number;
    unit: string;
  };
  cpu: {
    usagePercent: number;
    processTime: number;
    uptime: number;
    unit: string;
  };
  disk: {
    totalSizeGB: number;
    availableSizeGB: number;
    usedSizeGB: number;
    usagePercent: number;
    driveName: string;
    driveType: string;
    unit: string;
  };
  system: {
    machineName: string;
    processorCount: number;
    osVersion: string;
    frameworkVersion: string;
    workingDirectory: string;
    userDomainName: string;
    userName: string;
    is64BitOperatingSystem: boolean;
    is64BitProcess: boolean;
    systemUpTime: number;
  };
  timestamp: string;
}

/**
 * 获取系统状态
 */
export async function getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
  return request<ApiResponse<SystemStatus>>('/api/maintenance/health', {
    method: 'GET',
  });
}

/**
 * 获取系统资源使用情况
 */
export async function getSystemResources(): Promise<ApiResponse<SystemResources>> {
  return request<ApiResponse<SystemResources>>('/api/systemmonitor/resources', {
    method: 'GET',
  });
}
