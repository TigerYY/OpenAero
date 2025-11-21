/**
 * 方案审核工具库
 */

import { prisma } from '@/lib/prisma';
import { SolutionStatus, ReviewStatus, ReviewDecision } from '@prisma/client';

export interface CreateReviewData {
  solutionId: string;
  reviewerId: string;
  score?: number;
  comments?: string;
  qualityScore?: number;
  completeness?: number;
  innovation?: number;
  marketPotential?: number;
  decision: ReviewDecision;
  decisionNotes?: string;
  suggestions?: string[];
}

export interface ReviewWithDetails {
  id: string;
  solutionId: string;
  reviewerId: string;
  status: ReviewStatus;
  fromStatus: SolutionStatus; // **新增**：审核前状态
  toStatus: SolutionStatus; // **新增**：审核后状态
  score: number | null;
  comments: string | null;
  qualityScore: number | null;
  completeness: number | null;
  innovation: number | null;
  marketPotential: number | null;
  decision: ReviewDecision;
  decisionNotes: string | null;
  suggestions: string[];
  reviewStartedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  solution: {
    id: string;
    title: string;
    status: SolutionStatus;
  };
  reviewer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

/**
 * 开始审核（分配审核员）
 */
export async function startReview(
  solutionId: string,
  reviewerId: string
): Promise<ReviewWithDetails> {
  // 检查方案是否存在
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
  });

  if (!solution) {
    throw new Error('方案不存在');
  }

  if (solution.status !== SolutionStatus.PENDING_REVIEW) {
    throw new Error('只能审核待审核状态的方案');
  }

  // 检查是否已有进行中的审核
  const existingReview = await prisma.solutionReview.findFirst({
    where: {
      solution_id: solutionId,
      status: ReviewStatus.IN_PROGRESS,
    },
  });

  if (existingReview) {
    throw new Error('该方案已有进行中的审核');
  }

  // 创建审核记录（记录 fromStatus）
  const review = await prisma.solutionReview.create({
    data: {
      solution_id: solutionId,
      reviewer_id: reviewerId,
      status: ReviewStatus.IN_PROGRESS,
      decision: ReviewDecision.PENDING,
      from_status: solution.status, // **新增**：记录审核前的状态
      to_status: solution.status, // 初始值设为当前状态，完成审核时会更新
      reviewStartedAt: new Date(),
    },
    include: {
      solution: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  // 获取审核员信息
  const reviewer = await prisma.userProfile.findUnique({
    where: { user_id: reviewerId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
    },
  });

  return {
    ...review,
    reviewer: {
      id: reviewerId,
      firstName: reviewer?.first_name || null,
      lastName: reviewer?.last_name || null,
    },
  } as ReviewWithDetails;
}

/**
 * 完成审核（批准或拒绝）
 * 注意：这里使用 solutionId 而不是 reviewId，因为可能需要创建新的审核记录
 */
export async function completeReview(
  solutionId: string,
  data: {
    reviewId?: string;
    decision: ReviewDecision;
    score?: number;
    comments?: string;
    qualityScore?: number;
    completeness?: number;
    innovation?: number;
    marketPotential?: number;
    decisionNotes?: string;
    suggestions?: string[];
    reviewerId?: string; // 如果没有找到审核记录，需要提供审核员ID
  }
): Promise<ReviewWithDetails> {
  // 查找审核记录（如果有 reviewId，使用它；否则查找进行中的审核）
  let review = data.reviewId
    ? await prisma.solutionReview.findUnique({
        where: { id: data.reviewId },
      })
    : await prisma.solutionReview.findFirst({
        where: {
          solution_id: solutionId,
          status: ReviewStatus.IN_PROGRESS,
        },
      });

  // 获取方案当前状态（用于 fromStatus）
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
    select: { status: true },
  });

  if (!solution) {
    throw new Error('方案不存在');
  }

  // 如果没有找到审核记录，创建一个新的（如果提供了reviewerId）
  if (!review) {
    if (!data.reviewerId) {
      throw new Error('未找到审核记录，请先开始审核或提供审核员ID');
    }
    // 创建新的审核记录（记录 fromStatus）
    review = await prisma.solutionReview.create({
      data: {
        solution_id: solutionId,
        reviewer_id: data.reviewerId,
        status: ReviewStatus.IN_PROGRESS,
        decision: ReviewDecision.PENDING,
        from_status: solution.status, // **新增**：记录审核前的状态
        to_status: solution.status, // 初始值设为当前状态，完成审核时会更新
        review_started_at: new Date(),
      },
    });
  }

  if (review.status !== ReviewStatus.IN_PROGRESS) {
    throw new Error('只能完成进行中的审核');
  }

  // 获取审核前的状态（fromStatus）
  // 优先使用审核记录中已记录的 fromStatus，如果没有则使用方案当前状态
  const fromStatus = review.fromStatus || solution.status;

  // 确定审核后的状态（toStatus）
  let newStatus: SolutionStatus;
  if (data.decision === ReviewDecision.APPROVED) {
    newStatus = SolutionStatus.APPROVED;
  } else if (data.decision === ReviewDecision.REJECTED) {
    newStatus = SolutionStatus.REJECTED;
  } else if (data.decision === ReviewDecision.NEEDS_REVISION) {
    newStatus = SolutionStatus.PENDING_REVIEW; // 保持待审核状态，等待修改
  } else {
    newStatus = fromStatus; // 保持原状态
  }

  // 使用事务更新审核记录和方案状态
  const [updatedReviewRecord, updatedSolution] = await prisma.$transaction([
    // 更新审核记录（包含 fromStatus/toStatus）
    prisma.solutionReview.update({
      where: { id: review.id },
      data: {
        status: ReviewStatus.COMPLETED,
        decision: data.decision,
        from_status: fromStatus, // **新增**：记录审核前的状态
        to_status: newStatus, // **新增**：记录审核后的状态
        score: data.score,
        comments: data.comments,
        quality_score: data.qualityScore,
        completeness: data.completeness,
        innovation: data.innovation,
        market_potential: data.marketPotential,
        decision_notes: data.decisionNotes,
        suggestions: data.suggestions || [],
        reviewed_at: new Date(),
      },
      include: {
        solution: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    }),
    // 更新方案状态和 lastReviewedAt
    prisma.solution.update({
      where: { id: solutionId },
      data: {
        status: newStatus,
        reviewed_at: new Date(),
        review_notes: data.decisionNotes || data.comments || null,
      },
    }),
  ]);

  // 获取方案完整信息（用于返回）
  const solutionFull = await prisma.solution.findUnique({
    where: { id: solutionId },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  // 获取审核员ID（可能在不同字段中）
  // Prisma 会自动将 snake_case 字段名转换为 camelCase
  const reviewerId = 
    (review as any).reviewerId ||          // Prisma 转换后的字段名
    (review as any).reviewer_id ||         // 原始数据库字段名（备用）
    (updatedReviewRecord as any).reviewerId ||  // 更新后的记录
    (updatedReviewRecord as any).reviewer_id || // 更新后的记录（备用）
    data.reviewerId;                       // 从参数传入的（最可靠）
  
  if (!reviewerId) {
    console.error('[completeReview] ❌ 无法获取审核员ID');
    console.error('[completeReview] review对象:', JSON.stringify(review, null, 2));
    console.error('[completeReview] updatedReviewRecord对象:', JSON.stringify(updatedReviewRecord, null, 2));
    console.error('[completeReview] data.reviewerId:', data.reviewerId);
    throw new Error('无法获取审核员ID，请确保提供了 reviewerId');
  }
  
  console.log('[completeReview] ✅ 获取到审核员ID:', reviewerId);

  // 获取审核员信息
  const reviewer = await prisma.userProfile.findUnique({
    where: { user_id: reviewerId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
    },
  });

  return {
    ...updatedReviewRecord,
    solution: {
      id: solutionId,
      title: solutionFull?.title || '',
      status: newStatus,
    },
    reviewer: {
      id: reviewerId,
      firstName: reviewer?.first_name || null,
      lastName: reviewer?.last_name || null,
    },
  } as ReviewWithDetails;
}

/**
 * 获取方案的审核历史
 */
export async function getSolutionReviewHistory(
  solutionId: string
): Promise<ReviewWithDetails[]> {
  const reviews = await prisma.solutionReview.findMany({
    where: { solution_id: solutionId },
    include: {
      solution: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  // 获取所有审核员信息
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewerId))];
  const reviewers = await prisma.userProfile.findMany({
    where: { user_id: { in: reviewerIds } },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
    },
  });

  const reviewerMap = new Map(
    reviewers.map((r) => [r.user_id, { firstName: r.first_name, lastName: r.last_name }])
  );

  return reviews.map((review) => ({
    ...review,
    fromStatus: review.fromStatus, // **新增**：包含 fromStatus
    toStatus: review.toStatus, // **新增**：包含 toStatus
    reviewer: {
      id: review.reviewerId,
      firstName: reviewerMap.get(review.reviewerId)?.firstName || null,
      lastName: reviewerMap.get(review.reviewerId)?.lastName || null,
    },
  })) as ReviewWithDetails[];
}

/**
 * 获取审核统计
 */
export async function getReviewStatistics(
  reviewerId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  approved: number;
  rejected: number;
  needsRevision: number;
  averageScore: number;
  averageReviewTime: number; // 平均审核时间（小时）
}> {
  const where: any = {};
  if (reviewerId) {
    where.reviewer_id = reviewerId;
  }
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) {
      where.created_at.gte = startDate;
    }
    if (endDate) {
      where.created_at.lte = endDate;
    }
  }

  const [reviews, completedReviews] = await Promise.all([
    prisma.solutionReview.findMany({
      where,
      select: {
        status: true,
        decision: true,
        score: true,
        reviewStartedAt: true,
        reviewedAt: true,
      },
    }),
    prisma.solutionReview.findMany({
      where: {
        ...where,
        status: ReviewStatus.COMPLETED,
        reviewedAt: { not: null },
        reviewStartedAt: { not: null },
      },
      select: {
        reviewStartedAt: true,
        reviewedAt: true,
      },
    }),
  ]);

  const total = reviews.length;
  const pending = reviews.filter((r) => r.status === ReviewStatus.PENDING).length;
  const inProgress = reviews.filter((r) => r.status === ReviewStatus.IN_PROGRESS).length;
  const completed = reviews.filter((r) => r.status === ReviewStatus.COMPLETED).length;
  const approved = reviews.filter((r) => r.decision === ReviewDecision.APPROVED).length;
  const rejected = reviews.filter((r) => r.decision === ReviewDecision.REJECTED).length;
  const needsRevision = reviews.filter(
    (r) => r.decision === ReviewDecision.NEEDS_REVISION
  ).length;

  const scores = reviews.filter((r) => r.score !== null).map((r) => r.score!);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // 计算平均审核时间
  const reviewTimes = completedReviews
    .filter((r) => r.reviewStartedAt && r.reviewedAt)
    .map((r) => {
      const start = r.reviewStartedAt!.getTime();
      const end = r.reviewedAt!.getTime();
      return (end - start) / (1000 * 60 * 60); // 转换为小时
    });

  const averageReviewTime =
    reviewTimes.length > 0 ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length : 0;

  return {
    total,
    pending,
    inProgress,
    completed,
    approved,
    rejected,
    needsRevision,
    averageScore,
    averageReviewTime,
  };
}

