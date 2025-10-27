/**
 * 方案状态工作流管理
 * 定义方案状态转换规则和验证逻辑
 */

import { SolutionStatus } from '@/shared/types/solutions';

export interface StatusTransition {
  from: SolutionStatus;
  to: SolutionStatus;
  requiredRole?: string[];
  conditions?: (solution: any) => boolean;
  description: string;
}

/**
 * 方案状态转换规则
 */
export const STATUS_TRANSITIONS: StatusTransition[] = [
  // 草稿状态可以转换的状态
  {
    from: SolutionStatus.DRAFT,
    to: SolutionStatus.PENDING_REVIEW,
    description: '提交审核',
    conditions: (solution) => {
      // 验证方案完整性
      return validateSolutionCompleteness(solution);
    }
  },
  {
    from: SolutionStatus.DRAFT,
    to: SolutionStatus.ARCHIVED,
    description: '归档草稿'
  },

  // 待审核状态可以转换的状态
  {
    from: SolutionStatus.PENDING_REVIEW,
    to: SolutionStatus.APPROVED,
    requiredRole: ['admin', 'reviewer'],
    description: '审核通过'
  },
  {
    from: SolutionStatus.PENDING_REVIEW,
    to: SolutionStatus.REJECTED,
    requiredRole: ['admin', 'reviewer'],
    description: '审核拒绝'
  },

  // 已通过状态可以转换的状态
  {
    from: SolutionStatus.APPROVED,
    to: SolutionStatus.PUBLISHED,
    description: '发布方案'
  },
  {
    from: SolutionStatus.APPROVED,
    to: SolutionStatus.REJECTED,
    requiredRole: ['admin'],
    description: '撤销通过'
  },

  // 已拒绝状态可以转换的状态
  {
    from: SolutionStatus.REJECTED,
    to: SolutionStatus.DRAFT,
    description: '重新编辑'
  },
  {
    from: SolutionStatus.REJECTED,
    to: SolutionStatus.ARCHIVED,
    description: '归档拒绝的方案'
  },

  // 已发布状态可以转换的状态
  {
    from: SolutionStatus.PUBLISHED,
    to: SolutionStatus.ARCHIVED,
    requiredRole: ['admin', 'creator'],
    description: '下架方案'
  },

  // 已归档状态可以转换的状态
  {
    from: SolutionStatus.ARCHIVED,
    to: SolutionStatus.DRAFT,
    description: '恢复编辑'
  }
];

/**
 * 验证状态转换是否有效
 */
export function isValidStatusTransition(
  from: SolutionStatus,
  to: SolutionStatus,
  userRole?: string,
  solution?: any
): { valid: boolean; error?: string } {
  // 查找匹配的转换规则
  const transition = STATUS_TRANSITIONS.find(
    t => t.from === from && t.to === to
  );

  if (!transition) {
    return {
      valid: false,
      error: `不允许从 ${getStatusText(from)} 转换到 ${getStatusText(to)}`
    };
  }

  // 检查角色权限
  if (transition.requiredRole && userRole) {
    if (!transition.requiredRole.includes(userRole)) {
      return {
        valid: false,
        error: `权限不足，需要以下角色之一：${transition.requiredRole.join(', ')}`
      };
    }
  }

  // 检查条件
  if (transition.conditions && solution) {
    try {
      if (!transition.conditions(solution)) {
        return {
          valid: false,
          error: '不满足状态转换条件'
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || '状态转换条件验证失败'
      };
    }
  }

  return { valid: true };
}

/**
 * 获取可用的状态转换
 */
export function getAvailableTransitions(
  currentStatus: SolutionStatus,
  userRole?: string
): StatusTransition[] {
  return STATUS_TRANSITIONS.filter(transition => {
    if (transition.from !== currentStatus) return false;
    
    if (transition.requiredRole && userRole) {
      return transition.requiredRole.includes(userRole);
    }
    
    return true;
  });
}

/**
 * 获取状态显示文本
 */
export function getStatusText(status: SolutionStatus): string {
  const statusMap: Record<SolutionStatus, string> = {
    [SolutionStatus.DRAFT]: '草稿',
    [SolutionStatus.PENDING_REVIEW]: '待审核',
    [SolutionStatus.APPROVED]: '已通过',
    [SolutionStatus.REJECTED]: '已拒绝',
    [SolutionStatus.PUBLISHED]: '已发布',
    [SolutionStatus.ARCHIVED]: '已归档'
  };
  
  return statusMap[status] || '未知状态';
}

/**
 * 获取状态颜色样式
 */
export function getStatusColor(status: SolutionStatus): string {
  const colorMap: Record<SolutionStatus, string> = {
    [SolutionStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [SolutionStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
    [SolutionStatus.APPROVED]: 'bg-blue-100 text-blue-800',
    [SolutionStatus.REJECTED]: 'bg-red-100 text-red-800',
    [SolutionStatus.PUBLISHED]: 'bg-green-100 text-green-800',
    [SolutionStatus.ARCHIVED]: 'bg-gray-100 text-gray-600'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 验证方案完整性
 */
export function validateSolutionCompleteness(solution: any): boolean {
  const errors: string[] = [];

  // 基本信息验证
  if (!solution.title || solution.title.length < 5) {
    errors.push('方案标题不能少于5个字符');
  }

  if (!solution.description || solution.description.length < 20) {
    errors.push('方案描述不能少于20个字符');
  }

  if (solution.price === null || solution.price === undefined || solution.price < 0) {
    errors.push('请设置有效的方案价格');
  }

  // 媒体文件验证 - 在提交审核时才要求图片
  // if (!solution.images || solution.images.length === 0) {
  //   errors.push('请至少上传一张方案图片');
  // }

  // 技术规格验证 - 降低要求，允许空的specs
  // if (!solution.specs || Object.keys(solution.specs).length === 0) {
  //   errors.push('请填写方案技术规格');
  // }

  // BOM清单验证 - 降低要求，允许空的bom
  // if (!solution.bom || Object.keys(solution.bom).length === 0) {
  //   errors.push('请填写方案BOM清单');
  // }

  if (errors.length > 0) {
    throw new Error(`方案信息不完整：${errors.join('，')}`);
  }

  return true;
}

/**
 * 获取状态转换历史记录格式
 */
export interface StatusChangeRecord {
  id: string;
  solutionId: string;
  fromStatus: SolutionStatus;
  toStatus: SolutionStatus;
  userId: string;
  reason?: string;
  createdAt: Date;
}

/**
 * 创建状态变更记录
 */
export function createStatusChangeRecord(
  solutionId: string,
  fromStatus: SolutionStatus,
  toStatus: SolutionStatus,
  userId: string,
  reason?: string
): Omit<StatusChangeRecord, 'id' | 'createdAt'> {
  return {
    solutionId,
    fromStatus,
    toStatus,
    userId,
    reason
  };
}