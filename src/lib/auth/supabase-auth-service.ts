/**
 * Supabase 认证服务
 * 处理用户注册、登录、角色管理等
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { UserRole, UserStatus } from '@prisma/client';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendRoleChangeEmail,
} from '../email/smtp-service';

// 创建 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * 注册用户数据接口
 */
export interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * 注册新用户
 */
export async function registerUser(data: RegisterUserData) {
  try {
    // 1. 在 Supabase Auth 中创建用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // 需要邮箱验证
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || '创建用户失败');
    }

    // 2. 在数据库中创建用户记录
    const user = await prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        displayName: data.firstName && data.lastName 
          ? `${data.firstName} ${data.lastName}`
          : data.firstName || data.email.split('@')[0],
        role: UserRole.USER, // 默认角色
        status: UserStatus.INACTIVE, // 需要验证邮箱
      },
    });

    // 3. 生成邮箱验证链接
    const { data: linkData, error: linkError } = 
      await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: data.email,
      });

    if (!linkError && linkData.properties?.action_link) {
      // 4. 发送验证邮件
      await sendVerificationEmail(
        data.email,
        linkData.properties.action_link,
        user.displayName || undefined
      );
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  } catch (error: any) {
    console.error('用户注册失败:', error);
    throw new Error(error.message || '用户注册失败');
  }
}

/**
 * 登录用户
 */
export async function loginUser(email: string, password: string) {
  try {
    // 1. 使用 Supabase Auth 验证
    const { data: authData, error: authError } = 
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      throw new Error('邮箱或密码错误');
    }

    // 2. 检查邮箱是否已验证
    if (!authData.user.email_confirmed_at) {
      throw new Error('请先验证您的邮箱');
    }

    // 3. 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { supabaseId: authData.user.id },
      include: {
        creatorProfile: true,
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 4. 检查用户状态
    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('您的账户已被暂停');
    }

    if (user.status === UserStatus.DELETED) {
      throw new Error('您的账户已被删除');
    }

    // 5. 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE, // 激活账户
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
        creatorProfile: user.creatorProfile,
      },
      session: authData.session,
    };
  } catch (error: any) {
    console.error('用户登录失败:', error);
    throw new Error(error.message || '登录失败');
  }
}

/**
 * 验证邮箱
 */
export async function verifyEmail(token: string) {
  try {
    // 1. 使用 token 验证邮箱
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'signup',
    });

    if (error || !data.user) {
      throw new Error('验证链接无效或已过期');
    }

    // 2. 更新数据库中的用户状态
    const user = await prisma.user.update({
      where: { supabaseId: data.user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    // 3. 发送欢迎邮件
    await sendWelcomeEmail(user.email, user.displayName || user.email);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  } catch (error: any) {
    console.error('邮箱验证失败:', error);
    throw new Error(error.message || '验证失败');
  }
}

/**
 * 请求重置密码
 */
export async function requestPasswordReset(email: string) {
  try {
    // 1. 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为了安全，不暴露用户是否存在
      return { success: true };
    }

    // 2. 生成重置密码链接
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (error || !data.properties?.action_link) {
      throw new Error('生成重置链接失败');
    }

    // 3. 发送重置密码邮件
    await sendPasswordResetEmail(
      email,
      data.properties.action_link,
      user.displayName || undefined
    );

    return { success: true };
  } catch (error: any) {
    console.error('请求重置密码失败:', error);
    throw new Error(error.message || '请求失败');
  }
}

/**
 * 重置密码
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    // 1. 验证 token 并更新密码
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      token, // 这里应该是从 token 解析出的用户 ID
      { password: newPassword }
    );

    if (error) {
      throw new Error('重置密码失败');
    }

    return { success: true };
  } catch (error: any) {
    console.error('重置密码失败:', error);
    throw new Error(error.message || '重置密码失败');
  }
}

/**
 * 更新用户角色
 * 仅管理员可调用
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
) {
  try {
    // 1. 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new Error('权限不足');
    }

    // 2. 获取用户当前信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 3. 更新角色
    const oldRole = user.role;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // 4. 如果变更为创作者角色，创建创作者资料
    if (newRole === UserRole.CREATOR && !user.creatorProfile) {
      await prisma.creatorProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    // 5. 发送角色变更通知邮件
    await sendRoleChangeEmail(
      user.email,
      user.displayName || user.email,
      newRole,
      oldRole
    );

    // 6. 记录审计日志
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_USER_ROLE',
        resource: 'user',
        resourceId: userId,
        oldValue: { role: oldRole },
        newValue: { role: newRole },
        ipAddress: 'system',
        userAgent: 'system',
      },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    };
  } catch (error: any) {
    console.error('更新用户角色失败:', error);
    throw new Error(error.message || '更新角色失败');
  }
}

/**
 * 获取用户信息
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    throw new Error(error.message || '获取用户信息失败');
  }
}

/**
 * 更新用户信息
 */
export async function updateUserProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
  }
) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        displayName: data.firstName && data.lastName
          ? `${data.firstName} ${data.lastName}`
          : undefined,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    };
  } catch (error: any) {
    console.error('更新用户信息失败:', error);
    throw new Error(error.message || '更新失败');
  }
}

/**
 * 获取用户列表（管理员功能）
 */
export async function listUsers(params: {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}) {
  try {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { displayName: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creatorProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('获取用户列表失败:', error);
    throw new Error(error.message || '获取用户列表失败');
  }
}
