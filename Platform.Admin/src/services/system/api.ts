import { request } from '@umijs/max';
import type { ApiResponse } from './typings';

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
  Memory: {
    ProcessMemoryMB: number;
    TotalMemoryMB: number;
    AvailableMemoryMB: number;
    UsagePercent: number;
    Unit: string;
  };
  Cpu: {
    UsagePercent: number;
    ProcessTime: number;
    Uptime: number;
    Unit: string;
  };
  Disk: {
    TotalSizeGB: number;
    AvailableSizeGB: number;
    UsedSizeGB: number;
    UsagePercent: number;
    DriveName: string;
    DriveType: string;
    Unit: string;
  };
  System: {
    MachineName: string;
    ProcessorCount: number;
    OSVersion: string;
    FrameworkVersion: string;
    WorkingDirectory: string;
    UserDomainName: string;
    UserName: string;
    Is64BitOperatingSystem: boolean;
    Is64BitProcess: boolean;
    SystemUpTime: number;
  };
  Timestamp: string;
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
 * 获取系统资源使用情况（测试端点，无需认证）
 */
export async function getSystemResourcesTest(): Promise<ApiResponse<SystemResources>> {
  return request<ApiResponse<SystemResources>>('/api/systemmonitor/resources-test', {
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
