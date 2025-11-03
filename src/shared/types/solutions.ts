/**
 * 方案相关的共享类型定义
 */

export enum SolutionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum SolutionCategory {
  AGRICULTURE = 'AGRICULTURE',
  SURVEILLANCE = 'SURVEILLANCE',
  DELIVERY = 'DELIVERY',
  MAPPING = 'MAPPING',
  INSPECTION = 'INSPECTION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  RESEARCH = 'RESEARCH',
  OTHER = 'OTHER'
}

export enum FileType {
  PDF = 'PDF',
  CAD = 'CAD',
  CSV = 'CSV',
  ZIP = 'ZIP',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO'
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  category: SolutionCategory;
  status: SolutionStatus;
  price: number;
  creatorId: string;
  creatorName?: string;
  version: number;
  tags: string[];
  images?: string[];
  rating?: number;
  reviewCount?: number;
  viewCount?: number;
  downloadCount?: number;
  specs?: Record<string, string>;
  bom?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    supplier?: string;
    partNumber?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolutionFile {
  id: string;
  solutionId: string;
  filename: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  mimeType: string;
  path: string;
  thumbnailPath?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SolutionReview {
  id: string;
  solutionId: string;
  reviewerId: string;
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
  comments?: string;
  reviewedAt: Date;
  createdAt: Date;
}

export interface CreateSolutionRequest {
  title: string;
  description: string;
  category: SolutionCategory;
  price: number;
  tags: string[];
}

export interface UpdateSolutionRequest {
  title?: string;
  description?: string;
  category?: SolutionCategory;
  price?: number;
  tags?: string[];
}

export interface SolutionListResponse {
  solutions: Solution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SolutionSearchFilters {
  category?: SolutionCategory;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  creatorId?: string;
  status?: SolutionStatus;
  search?: string;
}