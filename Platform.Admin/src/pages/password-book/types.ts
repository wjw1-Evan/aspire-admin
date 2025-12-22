/**
 * 密码本相关类型定义
 */

/**
 * 密码强度等级（与后端枚举序列化后的 camelCase 字符串值匹配）
 */
export enum PasswordStrengthLevel {
  Weak = 'weak',
  Medium = 'medium',
  Strong = 'strong',
  VeryStrong = 'veryStrong',
}

/**
 * 密码本条目DTO（列表显示，不包含密码）
 */
export interface PasswordBookEntry {
  id: string;
  platform: string;
  account: string;
  url?: string;
  category?: string;
  tags: string[];
  notes?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 密码本条目详情DTO（包含解密后的密码）
 */
export interface PasswordBookEntryDetail extends PasswordBookEntry {
  password: string;
}

/**
 * 创建密码本条目请求
 */
export interface CreatePasswordBookEntryRequest {
  platform: string;
  account: string;
  password: string;
  url?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

/**
 * 更新密码本条目请求
 */
export interface UpdatePasswordBookEntryRequest {
  platform?: string;
  account?: string;
  password?: string;
  url?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

/**
 * 密码本查询请求
 */
export interface PasswordBookQueryRequest {
  current: number;
  pageSize: number;
  platform?: string;
  account?: string;
  category?: string;
  tags?: string[];
  keyword?: string;
}

/**
 * 密码本列表响应
 */
export interface PasswordBookListResponse {
  data: PasswordBookEntry[];
  total: number;
  success: boolean;
  current: number;
  pageSize: number;
}

/**
 * 密码强度检测结果
 */
export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  score: number;
  description: string;
  suggestions: string[];
}

/**
 * 密码生成请求
 */
export interface GeneratePasswordRequest {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSpecialChars: boolean;
}

/**
 * 密码生成响应
 */
export interface GeneratePasswordResponse {
  password: string;
  strength: PasswordStrengthResult;
}

/**
 * 导出密码本请求
 */
export interface ExportPasswordBookRequest {
  format: 'json' | 'csv';
  category?: string;
  tags?: string[];
}

/**
 * 密码本统计信息
 */
export interface PasswordBookStatistics {
  totalEntries: number;
  categoryCount: number;
  tagCount: number;
  recentUsedCount: number;
}
