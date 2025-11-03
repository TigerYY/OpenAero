/**
 * 共享类型定义索引文件
 */

// 认证相关类型
export * from './auth';

// 方案相关类型
export * from './solutions';

// 通用API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 文件上传响应
export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
}