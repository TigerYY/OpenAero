// 用户相关类型
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'CUSTOMER' | 'CREATOR' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  bio?: string;
  website?: string;
  experience?: string;
  specialties: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name?: string;
    avatar?: string;
  };
}

// 解决方案相关类型
export interface Solution {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  categoryId: string;
  price: number;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  images: string[];
  specs?: Record<string, any>;
  bom?: Record<string, any>;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: CreatorProfile;
  averageRating?: number;
  reviewCount?: number;
}

export interface SolutionFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  search?: string;
  sortBy?: 'price' | 'rating' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// 订单相关类型
export interface Order {
  id: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total: number;
  createdAt: Date;
  updatedAt: Date;
  orderSolutions?: OrderSolution[];
}

export interface OrderSolution {
  id: string;
  orderId: string;
  solutionId: string;
  quantity: number;
  price: number;
  solution?: Solution;
}

// 评价相关类型
export interface Review {
  id: string;
  userId: string;
  solutionId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 表单相关类型
export interface CreatorApplicationForm {
  bio: string;
  website?: string;
  experience: string;
  specialties: string[];
}

export interface SolutionForm {
  title: string;
  description: string;
  category: string;
  price: number;
  features: string[];
  specs: Record<string, any>;
  bom: Record<string, any>;
}

// 搜索相关类型
export interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
}

// 统计相关类型
export interface DashboardStats {
  totalSolutions: number;
  totalOrders: number;
  totalRevenue: number;
  pendingApplications: number;
  recentOrders: Order[];
  topSolutions: Solution[];
}

export interface CreatorStats {
  totalSolutions: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}
