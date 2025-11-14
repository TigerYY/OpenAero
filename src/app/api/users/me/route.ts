/**
 * 当前用户信息 API
 * GET /api/users/me - 获取当前用户信息
 * PATCH /api/users/me - 更新当前用户信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, getServerUserFromRequest, getServerExtendedUserFromRequest } from '@/lib/auth/auth-service';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

// 更新用户信息验证 schema
const updateProfileSchema = z.object({
  first_name: z.string().min(1, '名字不能为空').max(50, '名字过长').optional(),
  last_name: z.string().min(1, '姓氏不能为空').max(50, '姓氏过长').optional(),
  display_name: z.string().min(1, '显示名称不能为空').max(100, '显示名称过长').optional(),
  bio: z.string().max(500, '个人简介不能超过500字符').optional(),
  avatar: z.string().url('无效的头像URL').optional(),
  phone: z.string()
    .refine((val) => {
      if (!val || val.trim() === '') return true; // 允许空值
      // 移除所有空格、连字符、括号和点，只保留数字和+
      const cleaned = val.replace(/[\s\-().]/g, '');
      // 检查是否以+开头，后面跟数字，或者全部是数字
      // 国际格式：+国家代码+号码（总长度不超过15位，最少7位）
      // 或者纯数字（最少7位，最多15位）
      const phoneRegex = /^(\+[1-9]\d{0,14}|\d{7,15})$/;
      return phoneRegex.test(cleaned);
    }, {
      message: '无效的手机号码格式。请输入有效的国际格式（如 +86 138 0013 8000）或纯数字格式',
    })
    .optional()
    .nullable(),
});

/**
 * GET - 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 获取扩展用户信息
    let extendedUser = await getServerExtendedUserFromRequest(request);

    // 如果 profile 不存在，尝试创建
    if (!extendedUser?.profile) {
      console.log('Profile 不存在，尝试创建...');
      try {
        const { error: createError } = await AuthService.createProfileIfNotExists(user.id, {
          role: 'USER',
          status: 'ACTIVE',
        });

        if (!createError) {
          // 重新获取用户信息
          extendedUser = await getServerExtendedUserFromRequest(request);
          
          // 记录审计日志
          if (extendedUser?.profile) {
            await logAuditAction(request, {
              action: 'CREATE_PROFILE',
              resource: 'user_profiles',
              resource_id: user.id,
              metadata: { autoCreated: true },
            });
          }
        } else {
          console.error('创建 profile 失败:', createError);
        }
      } catch (createErr) {
        console.error('创建 profile 异常:', createErr);
      }
    }

    if (!extendedUser) {
      return createErrorResponse('用户信息不存在', 404);
    }

    return createSuccessResponse(extendedUser, '获取用户信息成功');
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return createErrorResponse(
      '获取用户信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * PATCH - 更新当前用户信息
 */
export async function PATCH(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 解析请求体
    const body = await request.json();

    // 验证输入
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const updates = validationResult.data;

    // 获取当前用户信息用于对比
    const extendedUser = await getServerExtendedUserFromRequest(request);
    const currentProfile = extendedUser?.profile;
    const currentPhone = user.phone;

    // 更新用户资料（phone 字段需要单独处理，因为它存储在 auth.users 中）
    const { phone, ...profileUpdates } = updates;
    
    // 记录修改的字段和值变化
    const changedFields: Record<string, { old: unknown; new: unknown }> = {};
    
    // 检查 profile 字段的变化
    if (profileUpdates.first_name !== undefined && profileUpdates.first_name !== currentProfile?.first_name) {
      changedFields.first_name = {
        old: currentProfile?.first_name || null,
        new: profileUpdates.first_name,
      };
    }
    if (profileUpdates.last_name !== undefined && profileUpdates.last_name !== currentProfile?.last_name) {
      changedFields.last_name = {
        old: currentProfile?.last_name || null,
        new: profileUpdates.last_name,
      };
    }
    if (profileUpdates.display_name !== undefined && profileUpdates.display_name !== currentProfile?.display_name) {
      changedFields.display_name = {
        old: currentProfile?.display_name || null,
        new: profileUpdates.display_name,
      };
    }
    if (profileUpdates.bio !== undefined && profileUpdates.bio !== currentProfile?.bio) {
      changedFields.bio = {
        old: currentProfile?.bio || null,
        new: profileUpdates.bio,
      };
    }
    if (profileUpdates.avatar !== undefined && profileUpdates.avatar !== currentProfile?.avatar) {
      changedFields.avatar = {
        old: currentProfile?.avatar || null,
        new: profileUpdates.avatar,
      };
    }
    
    // 更新 user_profiles 表
    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await AuthService.updateProfile(user.id, profileUpdates);
      if (error) {
        await logAuditAction(request, {
          action: 'UPDATE_PROFILE_FAILED',
          resource: 'user_profiles',
          resource_id: user.id,
          metadata: { 
            updates: profileUpdates,
            changedFields,
          },
          success: false,
          errorMessage: error.message,
        });
        return createErrorResponse(error.message, 400);
      }
    }

    // 更新 auth.users 的 phone（如果提供）
    if (phone !== undefined) {
      // 清理手机号码：移除空格、连字符、括号等，保留数字和+
      let phoneValue: string | null = phone ? phone.trim() : null;
      if (phoneValue) {
        // 移除所有空格、连字符、括号和点，但保留+号
        phoneValue = phoneValue.replace(/[\s\-().]/g, '');
        // 如果为空字符串，设置为 null
        if (phoneValue === '') {
          phoneValue = null;
        }
      }
      
      // 只有值真正改变时才更新
      if (phoneValue !== currentPhone) {
        const { error: phoneError } = await AuthService.updateUserPhone(user.id, phoneValue);
        if (phoneError) {
          await logAuditAction(request, {
            action: 'UPDATE_PHONE_FAILED',
            resource: 'auth.users',
            resource_id: user.id,
            metadata: {
              oldPhone: currentPhone || null,
              newPhone: phoneValue,
            },
            success: false,
            errorMessage: phoneError.message,
          });
          return createErrorResponse(phoneError.message, 400);
        }

        // 记录手机号更新审计日志
        await logAuditAction(request, {
          action: 'UPDATE_PHONE',
          resource: 'auth.users',
          resource_id: user.id,
          metadata: {
            oldPhone: currentPhone || null,
            newPhone: phoneValue,
          },
        });
      }
    }

    // 记录 profile 更新审计日志（如果有字段变化）
    if (Object.keys(changedFields).length > 0) {
      await logAuditAction(request, {
        action: 'UPDATE_PROFILE',
        resource: 'user_profiles',
        resource_id: user.id,
        metadata: {
          changedFields,
          updatedFields: Object.keys(profileUpdates),
        },
      });
    }

    // 获取更新后的用户信息
    const updatedUser = await AuthService.getExtendedUser(user.id);

    return createSuccessResponse(updatedUser, '用户信息更新成功');
  } catch (error: unknown) {
    console.error('Update user error:', error);
    return createErrorResponse(
      '更新用户信息失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}
