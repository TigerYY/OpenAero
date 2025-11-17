import { z } from 'zod';

import { db } from '@/lib/prisma';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/lib/error-handler';
import { isValidStatusTransition, validateSolutionCompleteness } from '@/lib/solution-status-workflow';
import { createSolutionSchema, updateSolutionSchema } from '@/lib/validations';
import { SolutionStatus } from '@/shared/types/solutions';

export interface CreateSolutionData {
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  categoryId?: string;
  specs?: Record<string, any>;
  bom?: Record<string, any>;
  features?: string[];
  images?: string[];
}

export interface UpdateSolutionData extends Partial<CreateSolutionData> {}

export class SolutionService {
  /**
   * 创建新的解决方案
   */
  async createSolution(data: CreateSolutionData, creatorId: string) {
    // 验证输入数据
    const validatedData = createSolutionSchema.parse(data);
    
    // 检查创作者是否存在且已认证
    const creator = await db.creatorProfile.findUnique({
      where: { user_id: creatorId },
      include: { user: true }
    });

    if (!creator) {
      throw new UnauthorizedError('只有认证的创作者才能创建方案');
    }

    if (creator.verification_status !== 'APPROVED') {
      throw new UnauthorizedError('创作者账户尚未通过审核');
    }

    // 检查标题是否已存在
    const existingSolution = await db.solution.findFirst({
      where: { title: validatedData.title }
    });

    if (existingSolution) {
      throw new ValidationError('方案标题已存在，请使用不同的标题');
    }

    // 创建方案
    const solution = await db.solution.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.categoryId || 'default',
        price: validatedData.price,
        creatorId: creator.id,
        userId: creatorId,
        status: 'DRAFT',
        specs: validatedData.specs || {},
        bom: validatedData.bom || {},
        features: validatedData.features || [],
        images: validatedData.images || [],
      },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    return solution;
  }

  /**
   * 更新解决方案
   */
  async updateSolution(solutionId: string, data: UpdateSolutionData, userId: string) {
    // 验证输入数据
    const validatedData = updateSolutionSchema.parse(data);

    // 获取方案信息
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    // 检查权限 - 只有方案创作者可以更新
    if (solution.creator.user_id !== userId) {
      throw new UnauthorizedError('只有方案创作者可以更新方案');
    }

    // 检查方案状态 - 只有草稿和被拒绝的方案可以更新
    const allowedStatuses = [SolutionStatus.DRAFT, SolutionStatus.REJECTED];
    if (!allowedStatuses.includes(solution.status as SolutionStatus)) {
      throw new ValidationError('只有草稿状态或被拒绝的方案可以更新');
    }

    // 如果更新了标题，需要检查是否重复
    const updateData: any = { ...validatedData };
    if (validatedData.title && validatedData.title !== solution.title) {
      // 检查新标题是否已存在
      const existingSolution = await db.solution.findFirst({
        where: { 
          title: validatedData.title,
          id: { not: solutionId }
        }
      });

      if (existingSolution) {
        throw new ValidationError('方案标题已存在，请使用不同的标题');
      }
    }

    // 更新方案
    const updatedSolution = await db.solution.update({
      where: { id: solutionId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    return updatedSolution;
  }

  /**
   * 删除解决方案
   */
  async deleteSolution(solutionId: string, userId: string) {
    // 获取方案信息
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    // 检查权限 - 只有方案创作者可以删除
    if (solution.creator.user_id !== userId) {
      throw new UnauthorizedError('只有方案创作者可以删除方案');
    }

    // 检查方案状态 - 只有草稿和被拒绝的方案可以删除
    if (!['DRAFT', 'REJECTED'].includes(solution.status)) {
      throw new ValidationError('只有草稿状态或被拒绝的方案可以删除');
    }

    // 删除方案
    await db.solution.delete({
      where: { id: solutionId }
    });

    return { success: true, message: '方案已成功删除' };
  }

  /**
   * 提交方案审核
   */
  async submitForReview(solutionId: string, userId: string) {
    // 获取方案信息
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    // 检查权限
    if (solution.creator.user_id !== userId) {
      throw new UnauthorizedError('只有方案创作者可以提交审核');
    }

    // 验证状态转换
    const transitionResult = isValidStatusTransition(
      solution.status as SolutionStatus,
      SolutionStatus.PENDING_REVIEW,
      'creator',
      solution
    );

    if (!transitionResult.valid) {
      throw new ValidationError(transitionResult.error || '无法提交审核');
    }

    // 更新状态为待审核
    const updatedSolution = await db.solution.update({
      where: { id: solutionId },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        creator: {
          include: {
            user: true
          }
        }
      }
    });

    return updatedSolution;
  }

  /**
   * 获取创作者的方案列表
   */
  async getCreatorSolutions(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [solutions, total] = await Promise.all([
      db.solution.findMany({
        where: {
          creator: {
            user_id: creatorId
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          creator: {
            include: {
              user: true
            }
          }
        }
      }),
      db.solution.count({
        where: {
          creator: {
            userId: creatorId
          }
        }
      })
    ]);

    return {
      solutions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 验证方案完整性
   */
  private validateSolutionCompleteness(solution: any) {
    const errors: string[] = [];

    if (!solution.title || solution.title.length < 5) {
      errors.push('方案标题不能少于5个字符');
    }

    if (!solution.description || solution.description.length < 50) {
      errors.push('方案描述不能少于50个字符');
    }

    if (solution.price === null || solution.price === undefined || solution.price < 0) {
      errors.push('请设置有效的方案价格');
    }

    if (!solution.images || solution.images.length === 0) {
      errors.push('请至少上传一张方案图片');
    }

    if (!solution.specs || Object.keys(solution.specs).length === 0) {
      errors.push('请填写方案技术规格');
    }

    if (!solution.bom || Object.keys(solution.bom).length === 0) {
      errors.push('请填写方案BOM清单');
    }

    if (errors.length > 0) {
      throw new ValidationError(`方案信息不完整：${errors.join('，')}`);
    }
  }

  /**
   * 自动分配审核员
   */
  async assignReviewer(solutionId: string) {
    // 获取可用的审核员（管理员）- 支持多角色
    const availableReviewers = await db.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' },
          { 
            profiles: { 
              some: { 
                OR: [
                  { role: 'ADMIN' },
                  { role: 'SUPER_ADMIN' }
                ]
              }
            }
          }
        ],
        // 可以添加更多条件，如在线状态、工作负载等
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            solutionReviews: {
              where: {
                status: 'IN_PROGRESS'
              }
            }
          }
        }
      }
    });

    if (availableReviewers.length === 0) {
      throw new ValidationError('当前没有可用的审核员');
    }

    // 选择工作负载最少的审核员
    const selectedReviewer = availableReviewers.reduce((prev, current) => {
      return (prev._count.solutionReviews < current._count.solutionReviews) ? prev : current;
    });

    // 创建审核记录并分配
    const review = await db.solutionReview.create({
      data: {
        solutionId,
        reviewerId: selectedReviewer.id,
        status: 'IN_PROGRESS',
        decision: 'PENDING',
        reviewStartedAt: new Date()
      }
    });

    return {
      review,
      reviewer: selectedReviewer
    };
  }

  /**
   * 开始审核流程
   */
  async startReview(solutionId: string, reviewerId?: string) {
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: { creator: { include: { user: true } } }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    if (solution.status !== 'PENDING_REVIEW') {
      throw new ValidationError('只能对待审核状态的方案开始审核');
    }

    let assignedReviewer;
    if (reviewerId) {
      // 手动分配审核员 - 支持多角色
      const reviewer = await db.user.findFirst({
        where: {
          id: reviewerId,
          OR: [
            { role: 'ADMIN' },
            { role: 'SUPER_ADMIN' },
            { 
              profiles: { 
                some: { 
                  OR: [
                    { role: 'ADMIN' },
                    { role: 'SUPER_ADMIN' }
                  ]
                }
              }
            }
          ]
        }
      });
      if (!reviewer) {
        throw new ValidationError('指定的审核员不存在或权限不足');
      }
      assignedReviewer = reviewer;
    } else {
      // 自动分配审核员
      const assignment = await this.assignReviewer(solutionId);
      assignedReviewer = assignment.reviewer;
    }

    // 更新方案状态为审核中（保持PENDING_REVIEW状态，通过审核记录表示正在审核）
    const updatedSolution = await db.solution.update({
      where: { id: solutionId },
      data: {
        // 不修改status，保持PENDING_REVIEW
        updatedAt: new Date()
      },
      include: {
        creator: {
          include: { user: true }
        }
      }
    });

    return {
      solution: updatedSolution,
      reviewer: assignedReviewer
    };
  }

  /**
   * 管理员批准方案
   */
  async approveSolution(solutionId: string, adminId: string, notes?: string) {
    // 检查方案是否存在
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: { creator: { include: { user: true } } }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    // 检查方案状态
    if (solution.status !== 'PENDING_REVIEW') {
      throw new ValidationError('只能审核待审核状态的方案');
    }

    // 检查是否有正在进行的审核
    const activeReview = await db.solutionReview.findFirst({
      where: {
        solutionId,
        status: 'IN_PROGRESS'
      }
    });

    // 更新方案状态
    const updatedSolution = await db.solution.update({
      where: { id: solutionId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewNotes: notes || '方案已通过审核'
      },
      include: {
        creator: {
          include: { user: true }
        }
      }
    });

    // 更新或创建审核历史记录
    if (activeReview) {
      await db.solutionReview.update({
        where: { id: activeReview.id },
        data: {
          status: 'COMPLETED',
          decision: 'APPROVED',
          comments: notes || '方案已通过审核',
          reviewedAt: new Date()
        }
      });
    } else {
      await db.solutionReview.create({
        data: {
          solutionId,
          reviewerId: adminId,
          status: 'COMPLETED',
          decision: 'APPROVED',
          comments: notes || '方案已通过审核',
          reviewedAt: new Date(),
          reviewStartedAt: new Date()
        }
      });
    }

    return updatedSolution;
  }

  /**
   * 管理员拒绝方案
   */
  async rejectSolution(solutionId: string, adminId: string, notes: string) {
    // 检查方案是否存在
    const solution = await db.solution.findUnique({
      where: { id: solutionId },
      include: { creator: { include: { user: true } } }
    });

    if (!solution) {
      throw new NotFoundError('方案不存在');
    }

    // 检查方案状态
    if (solution.status !== 'PENDING_REVIEW') {
      throw new ValidationError('只能审核待审核状态的方案');
    }

    // 更新方案状态
    const updatedSolution = await db.solution.update({
      where: { id: solutionId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewNotes: notes
      },
      include: {
        creator: {
          include: { user: true }
        }
      }
    });

    // 创建审核历史记录
    await db.solutionReview.create({
      data: {
        solutionId,
        reviewerId: adminId,
        status: 'COMPLETED',
        decision: 'REJECTED',
        comments: notes,
        reviewedAt: new Date()
      }
    });

    return updatedSolution;
  }

  /**
   * 获取方案审核历史
   */
  async getReviewHistory(solutionId: string) {
    const reviews = await db.solutionReview.findMany({
      where: { solutionId },
      include: {
        reviewer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reviews;
  }
}

export const solutionService = new SolutionService();