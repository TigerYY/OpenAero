/**
 * 创作者申请工具库
 */

import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

// 使用 VerificationStatus 作为申请状态
type ApplicationStatus = VerificationStatus;

export interface CreateApplicationData {
  userId: string;
  bio: string;
  website?: string;
  experience: string;
  specialties: string[];
  portfolio?: string[];
  documents?: string[];
}

export interface ApplicationWithDetails {
  id: string;
  userId: string;
  bio: string;
  website: string | null;
  experience: string;
  specialties: string[];
  portfolio: string[];
  documents: string[];
  status: ApplicationStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

/**
 * 创建创作者申请
 */
export async function createCreatorApplication(
  data: CreateApplicationData
): Promise<ApplicationWithDetails> {
  // 检查用户是否已经是创作者
  const existingCreator = await prisma.creatorProfile.findUnique({
    where: { user_id: data.userId },
  });

  if (existingCreator) {
    // 如果状态是 APPROVED，说明已经是创作者了
    if (existingCreator.verification_status === VerificationStatus.APPROVED) {
      throw new Error('您已经是创作者了');
    }
    
    // 如果状态是 PENDING，返回现有申请（不允许重复提交）
    if (existingCreator.verification_status === VerificationStatus.PENDING) {
      const userProfile = await prisma.userProfile.findUnique({
        where: { user_id: data.userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      let userEmail = '';
      try {
        const { createSupabaseServerClient } = await import('./auth/supabase-client');
        const supabase = createSupabaseServerClient();
        const { data: authUser } = await supabase.auth.admin.getUserById(data.userId);
        userEmail = authUser?.user?.email || '';
      } catch (error) {
        console.warn('获取用户邮箱失败:', error);
      }

      return {
        id: existingCreator.id,
        userId: data.userId,
        bio: existingCreator.bio || data.bio,
        website: existingCreator.website || data.website || null,
        experience: existingCreator.experience || data.experience,
        specialties: existingCreator.specialties.length > 0 ? existingCreator.specialties : data.specialties,
        portfolio: data.portfolio || [],
        documents: data.documents || [],
        status: existingCreator.verification_status,
        submittedAt: existingCreator.created_at,
        reviewedAt: existingCreator.verified_at,
        reviewedBy: null,
        reviewNotes: existingCreator.rejection_reason,
        user: {
          id: data.userId,
          email: userEmail,
          firstName: userProfile?.first_name || null,
          lastName: userProfile?.last_name || null,
        },
      };
    }
    
    // 如果状态是 REJECTED 或 EXPIRED，允许重新申请（更新现有记录）
    if (existingCreator.verification_status === VerificationStatus.REJECTED || 
        existingCreator.verification_status === VerificationStatus.EXPIRED) {
      // 更新现有记录，重置为 PENDING 状态
      const updatedCreator = await prisma.creatorProfile.update({
        where: { user_id: data.userId },
        data: {
          verification_status: VerificationStatus.PENDING,
          bio: data.bio,
          website: data.website || null,
          experience: data.experience,
          specialties: data.specialties,
          verified_at: null,
          rejection_reason: null,
        },
      });

      const userProfile = await prisma.userProfile.findUnique({
        where: { user_id: data.userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      let userEmail = '';
      try {
        const { createSupabaseServerClient } = await import('./auth/supabase-client');
        const supabase = createSupabaseServerClient();
        const { data: authUser } = await supabase.auth.admin.getUserById(data.userId);
        userEmail = authUser?.user?.email || '';
      } catch (error) {
        console.warn('获取用户邮箱失败:', error);
      }

      return {
        id: updatedCreator.id,
        userId: data.userId,
        bio: updatedCreator.bio || '',
        website: updatedCreator.website || null,
        experience: updatedCreator.experience || '',
        specialties: updatedCreator.specialties || [],
        portfolio: data.portfolio || [],
        documents: data.documents || [],
        status: updatedCreator.verification_status,
        submittedAt: updatedCreator.created_at,
        reviewedAt: updatedCreator.verified_at,
        reviewedBy: null,
        reviewNotes: updatedCreator.rejection_reason,
        user: {
          id: data.userId,
          email: userEmail,
          firstName: userProfile?.first_name || null,
          lastName: userProfile?.last_name || null,
        },
      };
    }
  }

  // 检查用户资料是否存在
  const userProfile = await prisma.userProfile.findUnique({
    where: { user_id: data.userId },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
    },
  });

  if (!userProfile) {
    throw new Error('用户资料不存在');
  }

  // 创建 CreatorProfile 记录（使用 verification_status = PENDING 表示待审核）
  // 保存申请详细信息到 CreatorProfile 表
  const creatorProfile = await prisma.creatorProfile.create({
    data: {
      user_id: data.userId,
      verification_status: VerificationStatus.PENDING,
      bio: data.bio,
      website: data.website || null,
      experience: data.experience,
      specialties: data.specialties,
    },
  });

  // 获取用户邮箱
  let userEmail = '';
  try {
    const { createSupabaseServerClient } = await import('./auth/supabase-client');
    const supabase = createSupabaseServerClient();
    const { data: authUser } = await supabase.auth.admin.getUserById(data.userId);
    userEmail = authUser?.user?.email || '';
  } catch (error) {
    console.warn('获取用户邮箱失败:', error);
  }

  return {
    id: creatorProfile.id,
    userId: data.userId,
    bio: data.bio,
    website: data.website || null,
    experience: data.experience,
    specialties: data.specialties,
    portfolio: data.portfolio || [],
    documents: data.documents || [],
    status: creatorProfile.verification_status,
    submittedAt: creatorProfile.created_at,
    reviewedAt: creatorProfile.verified_at,
    reviewedBy: null,
    reviewNotes: creatorProfile.rejection_reason,
    user: {
      id: data.userId,
      email: userEmail,
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
    },
  };
}

/**
 * 获取用户的申请状态
 * 返回所有状态的申请（包括 PENDING、APPROVED、REJECTED）
 */
export async function getUserApplicationStatus(
  userId: string
): Promise<ApplicationWithDetails | null> {
  // 使用 CreatorProfile 的 verification_status 来查询申请状态
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { user_id: userId },
  });

  if (!creatorProfile) {
    return null;
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
    select: {
      first_name: true,
      last_name: true,
    },
  });

  // 获取用户邮箱（从 Supabase Auth）
  let userEmail = '';
  try {
    const { createSupabaseServerClient } = await import('./auth/supabase-client');
    const supabase = createSupabaseServerClient();
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    userEmail = authUser?.user?.email || '';
  } catch (error) {
    console.warn('获取用户邮箱失败:', error);
  }

  // 返回所有状态的申请信息（不只是 PENDING）
  return {
    id: creatorProfile.id,
    userId,
    bio: '', // CreatorProfile 中没有 bio 字段
    website: null,
    experience: '',
    specialties: [],
    portfolio: [],
    documents: [],
    status: creatorProfile.verification_status,
    submittedAt: creatorProfile.created_at,
    reviewedAt: creatorProfile.verified_at,
    reviewedBy: null,
    reviewNotes: creatorProfile.rejection_reason,
    user: {
      id: userId,
      email: userEmail,
      firstName: userProfile?.first_name || null,
      lastName: userProfile?.last_name || null,
    },
  };
}

/**
 * 获取申请列表（管理员）
 */
export async function getApplications(
  page: number = 1,
  limit: number = 10,
  status?: ApplicationStatus
): Promise<{ applications: ApplicationWithDetails[]; total: number }> {
  const skip = (page - 1) * limit;

  console.log('getApplications 调用参数:', { page, limit, status });

  const where: any = {};
  if (status) {
    where.verification_status = status;
  }
  
  console.log('Prisma 查询条件:', where);

  // 使用 CreatorProfile 查询申请列表
  const [profiles, total] = await Promise.all([
    prisma.creatorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.creatorProfile.count({ where }),
  ]);

  // 获取所有用户的邮箱
  const userIds = profiles.map(p => p.user_id);
  const emailMap = new Map<string, string>();
  
  try {
    const { createSupabaseServerClient } = await import('./auth/supabase-client');
    const supabase = createSupabaseServerClient();
    
    // 批量获取用户邮箱
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.user?.email) {
            emailMap.set(userId, authUser.user.email);
          }
        } catch (error) {
          console.warn(`获取用户 ${userId} 邮箱失败:`, error);
        }
      })
    );
  } catch (error) {
    console.warn('批量获取用户邮箱失败:', error);
  }

  // 转换为 ApplicationWithDetails 格式
  const applications: ApplicationWithDetails[] = profiles.map((profile) => ({
    id: profile.id,
    userId: profile.user_id,
    bio: profile.bio || '',
    website: profile.website || null,
    experience: profile.experience || '',
    specialties: profile.specialties || [],
    portfolio: [], // portfolio 和 documents 字段在 CreatorProfile 中不存在，暂时返回空数组
    documents: [],
    status: profile.verification_status,
    submittedAt: profile.created_at,
    reviewedAt: profile.verified_at,
    reviewedBy: null,
    reviewNotes: profile.rejection_reason,
    user: {
      id: profile.user_id,
      email: emailMap.get(profile.user_id) || '',
      firstName: profile.user?.first_name || null,
      lastName: profile.user?.last_name || null,
    },
  }));

  console.log('getApplications 返回结果:', {
    applicationsCount: applications.length,
    total,
    firstApplication: applications[0] ? {
      id: applications[0].id,
      userId: applications[0].userId,
      status: applications[0].status,
      userEmail: applications[0].user.email,
    } : null,
  });

  return {
    applications,
    total,
  };
}

/**
 * 审核申请（管理员操作）
 */
export async function reviewApplication(
  applicationId: string,
  approved: boolean,
  adminId: string,
  notes?: string
): Promise<ApplicationWithDetails> {
  // 使用 CreatorProfile 作为申请记录
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: applicationId },
    include: {
      user: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  if (!creatorProfile) {
    throw new Error('申请不存在');
  }

  if (creatorProfile.verification_status !== VerificationStatus.PENDING) {
    throw new Error('申请已被处理');
  }

  // 更新 CreatorProfile 状态
  const updatedProfile = await prisma.creatorProfile.update({
    where: { id: applicationId },
    data: {
      verification_status: approved ? VerificationStatus.APPROVED : VerificationStatus.REJECTED,
      verified_at: new Date(),
      rejection_reason: approved ? null : (notes || '申请未通过审核'),
    },
    include: {
      user: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  // 如果批准，更新用户角色为 CREATOR
  if (approved) {
    // 获取当前用户角色
    const currentUser = await prisma.userProfile.findUnique({
      where: { user_id: creatorProfile.user_id },
      select: { roles: true },
    });
    
    // 添加 CREATOR 角色（如果还没有）
    const currentRoles = currentUser?.roles || [];
    if (!currentRoles.includes('CREATOR')) {
      await prisma.userProfile.update({
        where: { user_id: creatorProfile.user_id },
        data: { 
          roles: [...currentRoles, 'CREATOR'],
        },
      });
    }
  }

  // 获取用户邮箱（从 Supabase Auth）
  let userEmail = '';
  try {
    const { createSupabaseServerClient } = await import('./auth/supabase-client');
    const supabase = createSupabaseServerClient();
    const { data: authUser } = await supabase.auth.admin.getUserById(creatorProfile.user_id);
    userEmail = authUser?.user?.email || '';
  } catch (error) {
    console.warn('获取用户邮箱失败:', error);
  }

  return {
    id: updatedProfile.id,
    userId: updatedProfile.user_id,
    bio: '',
    website: null,
    experience: '',
    specialties: [],
    portfolio: [],
    documents: [],
    status: updatedProfile.verification_status,
    submittedAt: updatedProfile.created_at,
    reviewedAt: updatedProfile.verified_at,
    reviewedBy: adminId,
    reviewNotes: updatedProfile.rejection_reason,
    user: {
      id: updatedProfile.user_id,
      email: userEmail,
      firstName: updatedProfile.user?.first_name || null,
      lastName: updatedProfile.user?.last_name || null,
    },
  };
}

