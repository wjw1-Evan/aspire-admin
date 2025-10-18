export enum DataSourceType {
  MySql = 1,
  PostgreSQL = 2,
  Oracle = 3,
  MongoDB = 4,
  RestApi = 5,
  IoT = 6,
  LogFile = 7,
  MessageQueue = 8,
}

export enum DataSourceStatus {
  Active = 1,
  Offline = 2,
  Error = 3,
  Testing = 4,
}

export interface DataSource {
  id?: string;
  name: string;
  title: string;
  description?: string;
  dataSourceType: DataSourceType;
  connectionString?: string;
  connectionConfig: Record<string, any>;
  status: DataSourceStatus;
  lastTestedAt?: string;
  lastErrorMessage?: string;
  isEnabled: boolean;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceRequest {
  name: string;
  title: string;
  description?: string;
  dataSourceType: DataSourceType;
  connectionString?: string;
  connectionConfig: Record<string, any>;
  tags: string[];
  metadata: Record<string, any>;
}

export interface UpdateDataSourceRequest {
  name?: string;
  title?: string;
  description?: string;
  connectionString?: string;
  connectionConfig?: Record<string, any>;
  tags?: string[];
  metadata?: Record<string, any>;
  isEnabled?: boolean;
}

export interface TestDataSourceRequest {
  dataSourceType: DataSourceType;
  connectionString?: string;
  connectionConfig: Record<string, any>;
}

export interface DataSourceTestResult {
  isSuccess: boolean;
  errorMessage?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}
