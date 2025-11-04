import { getServerSession } from 'next-auth';
import { auth } from './auth';

interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnAuthError?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // 发送API请求
  async request<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { skipAuth = false, retryOnAuthError = true, ...fetchOptions } = options;
    
    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // 添加认证头
    if (!skipAuth) {
      // 使用 NextAuth.js 获取会话信息
      const session = await getServerSession(auth);
      if (session?.user?.accessToken) {
        headers['Authorization'] = `Bearer ${session.user.accessToken}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers,
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // 处理401错误（未授权）
      if (response.status === 401 && !skipAuth && retryOnAuthError) {
        console.log('收到401响应，尝试刷新token');
        
        // 发送自定义事件通知会话管理器
        window.dispatchEvent(new CustomEvent('apiError', {
          detail: { status: 401, response }
        }));

        // 尝试刷新token并重试请求
        const refreshed = await this.handleTokenRefresh();
        if (refreshed) {
          console.log('Token刷新成功，重试请求');
          return this.request(endpoint, { ...options, retryOnAuthError: false });
        }
      }

      // 解析响应
      const data = await response.json();
      
      if (!response.ok) {
        // 发送API错误事件
        window.dispatchEvent(new CustomEvent('apiError', {
          detail: { 
            status: response.status, 
            response: data,
            endpoint,
            options: requestOptions
          }
        }));

        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.message,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API请求失败:', error);
      
      // 发送网络错误事件
      window.dispatchEvent(new CustomEvent('apiError', {
        detail: { 
          status: 0, 
          error,
          endpoint,
          options: requestOptions
        }
      }));

      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  // 处理token刷新
  private async handleTokenRefresh(): Promise<boolean> {
    // 如果已经在刷新中，等待刷新完成
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    // 开始刷新
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
      return true;
    } catch (error) {
      console.error('Token刷新失败:', error);
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // 执行token刷新
  private async performTokenRefresh(): Promise<void> {
    try {
      // 使用 NextAuth.js 的会话刷新机制
      // 这里可以调用重新认证的API端点
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('会话刷新失败');
      }
    } catch (error) {
      console.error('执行token刷新失败:', error);
      throw error;
    }
  }

  // GET请求
  async get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST请求
  async post<T = any>(
    endpoint: string, 
    data?: any, 
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT请求
  async put<T = any>(
    endpoint: string, 
    data?: any, 
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH请求
  async patch<T = any>(
    endpoint: string, 
    data?: any, 
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  async delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // 上传文件
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    options?: Omit<ApiRequestOptions, 'headers'>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    // 不设置Content-Type，让浏览器自动设置multipart/form-data
    const headers: Record<string, string> = {};
    
    // 添加认证头
    if (!options?.skipAuth) {
      // 使用 NextAuth.js 获取会话信息
      const session = await getServerSession(auth);
      if (session?.user?.accessToken) {
        headers['Authorization'] = `Bearer ${session.user.accessToken}`;
      }
    }

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

// 创建默认的API客户端实例
export const apiClient = new ApiClient();

// 导出类型
export type { ApiResponse, ApiRequestOptions };
export { ApiClient };