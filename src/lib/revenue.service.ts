import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * 收益分成服务
 */
export class RevenueService {
  /**
   * 处理支付成功后的收益分成
   */
  static async processRevenueShare(orderId: string, paymentId: string) {
    try {
      // 获取订单详情
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderSolutions: {
            include: {
              solution: {
                include: {
                  creator: true,
                },
              },
            },
          },
          paymentTransactions: {
            where: { id: paymentId },
          },
        },
      });

      if (!order) {
        throw new Error(`订单不存在: ${orderId}`);
      }

      if (!order.paymentTransactions.length) {
        throw new Error(`支付记录不存在: ${paymentId}`);
      }

      const payment = order.paymentTransactions[0];
      
      if (!payment) {
        throw new Error(`支付记录不存在: ${paymentId}`);
      }

      // 检查是否已经处理过收益分成
      const existingRevenueShare = await prisma.revenueShare.findFirst({
        where: { order_id: orderId },
      });

      if (existingRevenueShare) {
        logger.info('收益分成已存在，跳过处理', { orderId, revenueShareId: existingRevenueShare.id });
        return existingRevenueShare;
      }

      // 计算收益分成
      const totalAmount = Number(payment.amount);
      const platformFee = totalAmount * 0.5; // 平台收取50%
      const creatorRevenue = totalAmount - platformFee; // 创作者获得50%

      // 为每个订单项创建收益分成记录
      const revenueShares = await Promise.all(
        order.orderSolutions.map(async (orderSolution) => {
          const revenueShare = await prisma.revenueShare.create({
            data: {
              order_id: order.id,
              solution_id: orderSolution.solution_id,
              creator_id: orderSolution.solution.creator_id,
              total_amount: totalAmount,
              platform_fee: platformFee,
              creator_revenue: creatorRevenue,
              status: 'PENDING',
            },
          });

          logger.info('创建收益分成记录', {
            revenueShareId: revenueShare.id,
            orderId: order.id,
            solutionId: orderSolution.solution_id,
            creatorId: orderSolution.solution.creator_id,
            totalAmount: totalAmount,
            platformFee: platformFee,
            creatorRevenue: creatorRevenue,
          });

          return revenueShare;
        })
      );

      // 更新创作者收益总额
      const firstOrderSolution = order.orderSolutions[0];
      if (firstOrderSolution?.solution?.creator_id) {
        await this.updateCreatorRevenue(firstOrderSolution.solution.creator_id, creatorRevenue);
      }

      logger.info('收益分成处理完成', {
        orderId: order.id,
        paymentId: payment.id,
        revenueShareCount: revenueShares.length,
        totalAmount: totalAmount,
        platformFee: platformFee,
        creatorRevenue: creatorRevenue,
      });

      return revenueShares;
    } catch (error) {
      logger.error('处理收益分成失败', { orderId, paymentId, error });
      throw error;
    }
  }

  /**
   * 更新创作者收益总额
   */
  static async updateCreatorRevenue(creatorId: string, revenue: number) {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorId },
      });

      if (!creator) {
        throw new Error(`创作者不存在: ${creatorId}`);
      }

      const newRevenue = Number(creator.revenue) + revenue;

      await prisma.creatorProfile.update({
        where: { id: creatorId },
        data: {
          revenue: newRevenue,
        },
      });

      logger.info('更新创作者收益', {
        creatorId: creatorId,
        oldRevenue: Number(creator.revenue),
        newRevenue: newRevenue,
        addedRevenue: revenue,
      });
    } catch (error) {
      logger.error('更新创作者收益失败', { creatorId, revenue, error });
      throw error;
    }
  }

  /**
   * 获取创作者的收益统计
   */
  static async getCreatorRevenueStats(creatorId: string) {
    try {
      const [revenueShares, totalRevenue, pendingRevenue, availableRevenue] = await Promise.all([
        // 获取所有收益分成记录
        prisma.revenueShare.findMany({
          where: { creator_id: creatorId },
          include: {
            order: {
              include: {
                orderSolutions: {
                  include: {
                    solution: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        }),
        
        // 总收益
        prisma.revenueShare.aggregate({
          where: { creator_id: creatorId },
          _sum: {
            creator_revenue: true,
          },
        }),
        
        // 待结算收益
        prisma.revenueShare.aggregate({
          where: { 
            creator_id: creatorId,
            status: 'PENDING',
          },
          _sum: {
            creator_revenue: true,
          },
        }),
        
        // 可提现收益
        prisma.revenueShare.aggregate({
          where: { 
            creator_id: creatorId,
            status: 'AVAILABLE',
          },
          _sum: {
            creator_revenue: true,
          },
        }),
      ]);

      return {
        revenueShares,
        stats: {
          totalRevenue: Number(totalRevenue._sum?.creator_revenue || 0),
          pendingRevenue: Number(pendingRevenue._sum?.creator_revenue || 0),
          availableRevenue: Number(availableRevenue._sum?.creator_revenue || 0),
          withdrawnRevenue: 0, // 需要从提现记录中计算
        },
      };
    } catch (error) {
      logger.error('获取创作者收益统计失败', { creatorId, error });
      throw error;
    }
  }

  /**
   * 处理收益结算
   */
  static async settleRevenue(revenueShareId: string) {
    try {
      const revenueShare = await prisma.revenueShare.findUnique({
        where: { id: revenueShareId },
      });

      if (!revenueShare) {
        throw new Error(`收益分成记录不存在: ${revenueShareId}`);
      }

      if (revenueShare.status !== 'PENDING') {
        throw new Error(`收益分成状态不允许结算: ${revenueShare.status}`);
      }

      // 更新收益状态为可提现
      const settledRevenue = await prisma.revenueShare.update({
        where: { id: revenueShareId },
        data: {
          status: 'AVAILABLE',
          settled_at: new Date(),
        },
      });

      logger.info('收益结算成功', {
        revenueShareId: revenueShareId,
        creatorId: revenueShare.creator_id,
        amount: Number(revenueShare.creator_revenue),
      });

      return settledRevenue;
    } catch (error) {
      logger.error('收益结算失败', { revenueShareId, error });
      throw error;
    }
  }

  /**
   * 处理收益提现
   */
  static async withdrawRevenue(creatorId: string, amount: number, withdrawMethod: string, withdrawAccount: string) {
    try {
      // 获取可提现收益总额
      const availableRevenue = await prisma.revenueShare.aggregate({
        where: { 
          creator_id: creatorId,
          status: 'AVAILABLE',
        },
        _sum: {
          creator_revenue: true,
        },
      });

      const availableAmount = Number(availableRevenue._sum?.creator_revenue || 0);

      if (amount > availableAmount) {
        throw new Error(`提现金额超过可提现余额: ${amount} > ${availableAmount}`);
      }

      // 创建提现记录
      const withdrawal = await prisma.revenueShare.updateMany({
        where: { 
          creator_id: creatorId,
          status: 'AVAILABLE',
        },
        data: {
          status: 'WITHDRAWN',
          withdrawn_at: new Date(),
          withdraw_method: withdrawMethod,
          withdraw_account: withdrawAccount,
        },
      });

      logger.info('收益提现成功', {
        creatorId: creatorId,
        amount: amount,
        withdrawMethod: withdrawMethod,
        withdrawAccount: withdrawAccount,
        affectedRecords: withdrawal.count,
      });

      return withdrawal;
    } catch (error) {
      logger.error('收益提现失败', { creatorId, amount, withdrawMethod, withdrawAccount, error });
      throw error;
    }
  }
}