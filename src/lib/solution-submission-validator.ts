/**
 * 方案提交验证器
 * 验证方案是否符合提交审核的条件
 */

import { prisma } from '@/lib/prisma';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 验证方案是否可以提交审核
 * @param solutionId 方案ID
 * @returns 验证结果
 */
export async function validateSubmission(solutionId: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // 获取方案及其关联数据
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
    include: {
      assets: true,
      bomItems: true,
    },
  });

  if (!solution) {
    return {
      valid: false,
      errors: [{ field: 'solution', message: '方案不存在' }],
    };
  }

  // 检查必填字段
  if (!solution.title || solution.title.trim().length < 5) {
    errors.push({
      field: 'title',
      message: '方案标题不能少于5个字符',
    });
  }

  if (!solution.description || solution.description.trim().length < 20) {
    errors.push({
      field: 'description',
      message: '方案描述不能少于20个字符',
    });
  }

  if (!solution.category || solution.category.trim().length === 0) {
    errors.push({
      field: 'category',
      message: '请选择方案分类',
    });
  }

  // 检查至少一个 asset（SolutionAsset 或 SolutionFile）
  const hasAssets = (solution.assets && solution.assets.length > 0);
  const hasFiles = (solution as any).files && (solution as any).files.length > 0;
  
  if (!hasAssets && !hasFiles) {
    errors.push({
      field: 'assets',
      message: '请至少上传一个方案资产（图片、文档、视频或CAD文件）',
    });
  }

  // 检查至少一个 BOM 项（SolutionBomItem 或 JSON bom）
  const hasBomItems = (solution.bomItems && solution.bomItems.length > 0);
  const hasBomJson = solution.bom && 
                     typeof solution.bom === 'object' && 
                     Object.keys(solution.bom).length > 0;
  
  if (!hasBomItems && !hasBomJson) {
    errors.push({
      field: 'bom',
      message: '请至少添加一个BOM清单项',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取验证错误的友好提示信息
 */
export function getValidationErrorMessage(result: ValidationResult): string {
  if (result.valid) {
    return '';
  }

  return result.errors.map(e => e.message).join('；');
}

