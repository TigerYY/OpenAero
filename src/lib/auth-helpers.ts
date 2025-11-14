import { NextRequest, NextResponse } from 'next/server';
import { getServerExtendedUserFromRequest } from '@/lib/auth/auth-service';
import { ApiResponse } from '@/types';

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: NextResponse;
}

/**
 * Helper function to authenticate request and return a structured result
 * 使用 Supabase Auth 进行认证
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // 使用 Supabase Auth 获取用户信息
    const extendedUser = await getServerExtendedUserFromRequest(request);
    
    // ExtendedUser 结构: { id, email, phone, profile, creator_profile }
    if (!extendedUser || !extendedUser.id) {
      console.log('[authenticateRequest] 未找到用户，extendedUser:', extendedUser);
      
      // 尝试直接获取用户（不要求 profile）
      const { getServerUserFromRequest } = await import('./auth/auth-service');
      const user = await getServerUserFromRequest(request);
      
      if (!user) {
        console.log('[authenticateRequest] 直接获取用户也失败');
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: '未授权访问',
              code: 401,
            } as ApiResponse,
            { status: 401 }
          )
        };
      }
      
      // 如果用户存在但没有 profile，尝试创建
      console.log('[authenticateRequest] 用户存在但没有 profile，尝试创建');
      const { AuthService } = await import('./auth/auth-service');
      const createResult = await AuthService.createProfileIfNotExists(user.id);
      
      if (createResult.error) {
        console.log('[authenticateRequest] 无法创建 profile:', createResult.error);
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: '用户资料不存在',
              code: 401,
            } as ApiResponse,
            { status: 401 }
          )
        };
      }
      
      // 重新获取 extendedUser
      const retryExtendedUser = await getServerExtendedUserFromRequest(request);
      if (!retryExtendedUser || !retryExtendedUser.profile) {
        console.log('[authenticateRequest] 重新获取 extendedUser 失败');
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: '用户资料不存在',
              code: 401,
            } as ApiResponse,
            { status: 401 }
          )
        };
      }
      
      console.log('[authenticateRequest] 认证成功（通过创建 profile）:', {
        userId: retryExtendedUser.id,
        email: retryExtendedUser.email,
        role: retryExtendedUser.profile.role,
      });
      
      return {
        success: true,
        user: {
          id: retryExtendedUser.id,
          email: retryExtendedUser.email || '',
          role: retryExtendedUser.profile.role,
        }
      };
    }
    
    if (!extendedUser.profile) {
      console.log('[authenticateRequest] 未找到用户资料，但用户存在，尝试创建');
      // 用户存在但没有 profile，尝试创建
      const { AuthService } = await import('./auth/auth-service');
      const createResult = await AuthService.createProfileIfNotExists(extendedUser.id);
      
      if (createResult.error) {
        console.log('[authenticateRequest] 无法创建 profile:', createResult.error);
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: '用户资料不存在',
              code: 401,
            } as ApiResponse,
            { status: 401 }
          )
        };
      }
      
      // 重新获取 extendedUser
      const retryExtendedUser = await getServerExtendedUserFromRequest(request);
      if (!retryExtendedUser || !retryExtendedUser.profile) {
        console.log('[authenticateRequest] 重新获取 extendedUser 失败');
        return {
          success: false,
          error: NextResponse.json(
            {
              success: false,
              error: '用户资料不存在',
              code: 401,
            } as ApiResponse,
            { status: 401 }
          )
        };
      }
      
      console.log('[authenticateRequest] 认证成功（通过创建 profile）:', {
        userId: retryExtendedUser.id,
        email: retryExtendedUser.email,
        role: retryExtendedUser.profile.role,
      });
      
      return {
        success: true,
        user: {
          id: retryExtendedUser.id,
          email: retryExtendedUser.email || '',
          role: retryExtendedUser.profile.role,
        }
      };
    }
    
    console.log('[authenticateRequest] 认证成功:', {
      userId: extendedUser.id,
      email: extendedUser.email,
      role: extendedUser.profile.role,
    });
    
    return {
      success: true,
      user: {
        id: extendedUser.id,
        email: extendedUser.email || '',
        role: extendedUser.profile.role,
      }
    };
  } catch (error) {
    console.error('[authenticateRequest] 认证异常:', error);
    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: '认证失败',
          code: 401,
        } as ApiResponse,
        { status: 401 }
      )
    };
  }
}