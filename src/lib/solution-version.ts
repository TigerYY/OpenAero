import { prisma } from '@/lib/db';
import { Solution, SolutionVersion } from '@prisma/client';

export interface CreateVersionData {
  solutionId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  features: string[];
  specs?: any;
  bom?: any;
  changeLog?: string;
  createdBy: string;
}

export interface VersionComparison {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}

/**
 * 创建新版本
 */
export async function createSolutionVersion(data: CreateVersionData): Promise<SolutionVersion> {
  // 获取当前最大版本号
  const latestVersion = await prisma.solutionVersion.findFirst({
    where: { solutionId: data.solutionId },
    orderBy: { version: 'desc' },
  });

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  // 将之前的活跃版本设为非活跃
  await prisma.solutionVersion.updateMany({
    where: { 
      solutionId: data.solutionId,
      isActive: true 
    },
    data: { isActive: false },
  });

  // 创建新版本
  const newVersion = await prisma.solutionVersion.create({
    data: {
      solutionId: data.solutionId,
      version: newVersionNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      images: data.images,
      features: data.features,
      specs: data.specs,
      bom: data.bom,
      changeLog: data.changeLog,
      createdBy: data.createdBy,
      isActive: true,
    },
  });

  // 更新主方案表的版本号
  await prisma.solution.update({
    where: { id: data.solutionId },
    data: { 
      version: newVersionNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      images: data.images,
      features: data.features,
      specs: data.specs,
      bom: data.bom,
      updatedAt: new Date(),
    },
  });

  return newVersion;
}

/**
 * 获取方案的版本历史
 */
export async function getSolutionVersionHistory(solutionId: string): Promise<SolutionVersion[]> {
  return await prisma.solutionVersion.findMany({
    where: { solutionId },
    orderBy: { version: 'desc' },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * 获取特定版本
 */
export async function getSolutionVersion(solutionId: string, version: number): Promise<SolutionVersion | null> {
  return await prisma.solutionVersion.findUnique({
    where: {
      solutionId_version: {
        solutionId,
        version,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * 回滚到指定版本
 */
export async function rollbackToVersion(solutionId: string, targetVersion: number, userId: string): Promise<SolutionVersion> {
  const targetVersionData = await getSolutionVersion(solutionId, targetVersion);
  
  if (!targetVersionData) {
    throw new Error(`版本 ${targetVersion} 不存在`);
  }

  // 创建新版本（基于目标版本的数据）
  const rollbackVersion = await createSolutionVersion({
    solutionId,
    title: targetVersionData.title,
    description: targetVersionData.description,
    category: targetVersionData.category,
    price: Number(targetVersionData.price),
    images: targetVersionData.images,
    features: targetVersionData.features,
    specs: targetVersionData.specs,
    bom: targetVersionData.bom,
    changeLog: `回滚到版本 ${targetVersion}`,
    createdBy: userId,
  });

  return rollbackVersion;
}

/**
 * 比较两个版本的差异
 */
export async function compareVersions(
  solutionId: string, 
  version1: number, 
  version2: number
): Promise<VersionComparison[]> {
  const [v1, v2] = await Promise.all([
    getSolutionVersion(solutionId, version1),
    getSolutionVersion(solutionId, version2),
  ]);

  if (!v1 || !v2) {
    throw new Error('版本不存在');
  }

  const comparisons: VersionComparison[] = [];
  const fields = ['title', 'description', 'category', 'price', 'images', 'features', 'specs', 'bom'];

  for (const field of fields) {
    const oldValue = (v1 as any)[field];
    const newValue = (v2 as any)[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      comparisons.push({
        field,
        oldValue,
        newValue,
        type: 'modified',
      });
    }
  }

  return comparisons;
}

/**
 * 获取当前活跃版本
 */
export async function getActiveVersion(solutionId: string): Promise<SolutionVersion | null> {
  return await prisma.solutionVersion.findFirst({
    where: { 
      solutionId,
      isActive: true 
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * 删除版本（软删除，保留历史记录）
 */
export async function archiveVersion(solutionId: string, version: number): Promise<void> {
  const versionToArchive = await getSolutionVersion(solutionId, version);
  
  if (!versionToArchive) {
    throw new Error(`版本 ${version} 不存在`);
  }

  if (versionToArchive.isActive) {
    throw new Error('不能删除当前活跃版本');
  }

  // 这里可以添加软删除逻辑，或者移动到归档表
  // 暂时保留所有版本历史
}