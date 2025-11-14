/**
 * 用户头像上传 API
 * POST /api/users/avatar - 上传用户头像
 */

import { NextRequest } from 'next/server';
import { getServerUserFromRequest, AuthService } from '@/lib/auth/auth-service';
import { createSupabaseServerFromRequest, createSupabaseAdmin } from '@/lib/auth/supabase-client';
import {
  createSuccessResponse,
  createErrorResponse,
  logAuditAction,
} from '@/lib/api-helpers';

// 允许的头像文件类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// 最大文件大小：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST - 上传用户头像
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUserFromRequest(request);
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 获取文件
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return createErrorResponse('请选择要上传的头像文件', 400);
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return createErrorResponse(
        `不支持的文件类型。仅支持: ${ALLOWED_TYPES.join(', ')}`,
        400
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        400
      );
    }

    // 创建 Supabase 客户端（从请求中获取）
    const supabase = createSupabaseServerFromRequest(request);

    // 将文件转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${user.id}/${Date.now()}.${fileExt}`;

    console.log('准备上传头像:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId: user.id,
    });

    // 上传到 Supabase Storage (avatars bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // 如果文件已存在则覆盖
      });

    if (uploadError) {
      console.error('头像上传失败 - 详细错误:', {
        error: uploadError,
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        errorCode: uploadError.error,
        fileName,
        userId: user.id,
      });
      
      // 记录失败审计日志
      await logAuditAction(request, {
        action: 'UPLOAD_AVATAR_FAILED',
        resource: 'user_profiles',
        resource_id: user.id,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadError: uploadError.message,
          errorCode: uploadError.error,
        },
        success: false,
        errorMessage: uploadError.message,
      });

      // 返回更详细的错误信息
      return createErrorResponse(
        `头像上传失败: ${uploadError.message}`,
        500,
        {
          error: uploadError.error,
          message: uploadError.message,
          statusCode: uploadError.statusCode,
        }
      );
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // 使用 Admin 客户端更新用户 profile 中的 avatar 字段（绕过 RLS）
    const { error: updateError } = await AuthService.updateProfile(user.id, { avatar: avatarUrl });

    if (updateError) {
      console.error('更新头像URL失败:', updateError);
      
      // 尝试删除已上传的文件
      await supabase.storage.from('avatars').remove([fileName]);

      return createErrorResponse(`更新头像失败: ${updateError.message}`, 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      action: 'UPLOAD_AVATAR',
      resource: 'user_profiles',
      resource_id: user.id,
      metadata: {
        fileName,
        avatarUrl,
        fileSize: file.size,
        fileType: file.type,
      },
    });

    return createSuccessResponse(
      {
        avatarUrl,
        fileName,
      },
      '头像上传成功'
    );
  } catch (error: unknown) {
    console.error('头像上传异常:', error);
    return createErrorResponse(
      '头像上传失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

/**
 * DELETE - 删除用户头像
 */
export async function DELETE(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getServerUserFromRequest(request);
    if (!user) {
      return createErrorResponse('未授权访问', 401);
    }

    // 创建 Supabase 客户端（从请求中获取，用于 Storage 操作）
    const supabase = createSupabaseServerFromRequest(request);
    
    // 使用 Admin 客户端获取当前头像 URL（绕过 RLS）
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('avatar')
      .eq('user_id', user.id)
      .single();

    if (profile?.avatar) {
      // 从 URL 中提取文件名
      const urlParts = profile.avatar.split('/');
      const fileName = urlParts.slice(-2).join('/'); // avatars/userId/filename

      // 删除 Storage 中的文件
      await supabase.storage.from('avatars').remove([fileName]);
    }

    // 使用 Admin 客户端更新 profile，清除 avatar（绕过 RLS）
    const { error: updateError } = await AuthService.updateProfile(user.id, { avatar: null });

    if (updateError) {
      return createErrorResponse(`删除头像失败: ${updateError.message}`, 500);
    }

    // 记录审计日志
    await logAuditAction(request, {
      action: 'DELETE_AVATAR',
      resource: 'user_profiles',
      resource_id: user.id,
    });

    return createSuccessResponse(null, '头像删除成功');
  } catch (error: unknown) {
    console.error('删除头像异常:', error);
    return createErrorResponse(
      '删除头像失败',
      500,
      error instanceof Error ? { name: error.name, message: error.message } : undefined
    );
  }
}

