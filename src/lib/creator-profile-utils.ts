/**
 * 创作者档案工具函数
 * 用于自动创建和管理 CreatorProfile
 */

import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

/**
 * 确保用户有 CreatorProfile
 * 如果用户有 CREATOR 角色但没有 CreatorProfile，自动创建一个
 * @param userId 用户 ID
 * @returns CreatorProfile 或 null
 */
export async function ensureCreatorProfile(userId: string) {
  // 检查用户是否有 CREATOR 角色
  const userProfile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
    select: { roles: true },
  });

  const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
  
  // 如果用户没有 CREATOR 角色，返回 null
  if (!userRoles.includes('CREATOR') && !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN')) {
    return null;
  }

  // 检查是否已存在 CreatorProfile
  let creatorProfile = await prisma.creatorProfile.findUnique({
    where: { user_id: userId },
  });

  // 如果不存在，自动创建一个
  if (!creatorProfile) {
    // 获取用户基本信息用于填充默认值
    const userInfo = await prisma.userProfile.findUnique({
      where: { user_id: userId },
      select: {
        display_name: true,
        first_name: true,
        last_name: true,
      },
    });

    const displayName = userInfo?.display_name || 
      `${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`.trim() || 
      '创作者';

    // 创建 CreatorProfile，状态设为 APPROVED（因为用户已经被赋予了 CREATOR 角色）
    creatorProfile = await prisma.creatorProfile.create({
      data: {
        user_id: userId,
        verification_status: VerificationStatus.APPROVED,
        verified_at: new Date(),
        bio: `${displayName}的创作者档案`,
        specialties: [],
      },
    });

    console.log(`[ensureCreatorProfile] 自动创建 CreatorProfile for user ${userId}`);
  }

  return creatorProfile;
}

