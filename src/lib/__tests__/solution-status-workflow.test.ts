/**
 * 方案状态工作流单元测试
 * 测试状态转换验证逻辑
 */

import { SolutionStatus } from '@/shared/types/solutions';
import {
  isValidStatusTransition,
  getAvailableTransitions,
  getStatusText,
  getStatusColor,
  validateSolutionCompleteness,
  canEditSolution,
  canReviewSolution,
  canPublishSolution,
  canViewSolution,
  STATUS_TRANSITIONS,
} from '../solution-status-workflow';

describe('Solution Status Workflow', () => {
  describe('isValidStatusTransition', () => {
    it('应该允许从 DRAFT 转换到 PENDING_REVIEW', () => {
      const result = isValidStatusTransition(
        SolutionStatus.DRAFT,
        SolutionStatus.PENDING_REVIEW
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 DRAFT 转换到 ARCHIVED', () => {
      const result = isValidStatusTransition(
        SolutionStatus.DRAFT,
        SolutionStatus.ARCHIVED
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 PENDING_REVIEW 转换到 APPROVED（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.PENDING_REVIEW,
        SolutionStatus.APPROVED,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 PENDING_REVIEW 转换到 APPROVED（审核员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.PENDING_REVIEW,
        SolutionStatus.APPROVED,
        'reviewer'
      );
      expect(result.valid).toBe(true);
    });

    it('应该拒绝从 PENDING_REVIEW 转换到 APPROVED（无权限）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.PENDING_REVIEW,
        SolutionStatus.APPROVED,
        'creator'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('权限不足');
    });

    it('应该允许从 APPROVED 转换到 READY_TO_PUBLISH（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.APPROVED,
        SolutionStatus.READY_TO_PUBLISH,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 READY_TO_PUBLISH 转换到 PUBLISHED（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.READY_TO_PUBLISH,
        SolutionStatus.PUBLISHED,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 PUBLISHED 转换到 SUSPENDED（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.PUBLISHED,
        SolutionStatus.SUSPENDED,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 SUSPENDED 转换到 PUBLISHED（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.SUSPENDED,
        SolutionStatus.PUBLISHED,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该允许从 PUBLISHED 转换到 ARCHIVED（管理员）', () => {
      const result = isValidStatusTransition(
        SolutionStatus.PUBLISHED,
        SolutionStatus.ARCHIVED,
        'admin'
      );
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的状态转换', () => {
      const result = isValidStatusTransition(
        SolutionStatus.DRAFT,
        SolutionStatus.PUBLISHED
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不允许');
    });

    it('应该验证方案完整性条件（DRAFT -> PENDING_REVIEW）', () => {
      const incompleteSolution = {
        title: 'Test',
        description: 'Short',
        price: -1,
      };
      
      const result = isValidStatusTransition(
        SolutionStatus.DRAFT,
        SolutionStatus.PENDING_REVIEW,
        undefined,
        incompleteSolution
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('方案信息不完整');
    });

    it('应该通过方案完整性验证（DRAFT -> PENDING_REVIEW）', () => {
      const completeSolution = {
        title: 'Complete Test Solution Title',
        description: 'This is a complete solution description with enough characters',
        price: 1000,
      };
      
      const result = isValidStatusTransition(
        SolutionStatus.DRAFT,
        SolutionStatus.PENDING_REVIEW,
        undefined,
        completeSolution
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('getAvailableTransitions', () => {
    it('应该返回 DRAFT 状态的所有可用转换', () => {
      const transitions = getAvailableTransitions(SolutionStatus.DRAFT);
      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some(t => t.to === SolutionStatus.PENDING_REVIEW)).toBe(true);
      expect(transitions.some(t => t.to === SolutionStatus.ARCHIVED)).toBe(true);
    });

    it('应该根据用户角色过滤转换', () => {
      const adminTransitions = getAvailableTransitions(
        SolutionStatus.PENDING_REVIEW,
        'admin'
      );
      expect(adminTransitions.length).toBeGreaterThan(0);
      expect(adminTransitions.some(t => t.to === SolutionStatus.APPROVED)).toBe(true);
    });

    it('应该为 READY_TO_PUBLISH 状态返回正确的转换', () => {
      const transitions = getAvailableTransitions(
        SolutionStatus.READY_TO_PUBLISH,
        'admin'
      );
      expect(transitions.some(t => t.to === SolutionStatus.PUBLISHED)).toBe(true);
      expect(transitions.some(t => t.to === SolutionStatus.APPROVED)).toBe(true);
    });
  });

  describe('getStatusText', () => {
    it('应该返回正确的中文状态文本', () => {
      expect(getStatusText(SolutionStatus.DRAFT)).toBe('草稿');
      expect(getStatusText(SolutionStatus.PENDING_REVIEW)).toBe('待审核');
      expect(getStatusText(SolutionStatus.APPROVED)).toBe('已通过');
      expect(getStatusText(SolutionStatus.READY_TO_PUBLISH)).toBe('准备发布');
      expect(getStatusText(SolutionStatus.PUBLISHED)).toBe('已发布');
      expect(getStatusText(SolutionStatus.SUSPENDED)).toBe('临时下架');
      expect(getStatusText(SolutionStatus.ARCHIVED)).toBe('已归档');
    });
  });

  describe('getStatusColor', () => {
    it('应该返回正确的状态颜色类名', () => {
      expect(getStatusColor(SolutionStatus.DRAFT)).toContain('gray');
      expect(getStatusColor(SolutionStatus.PENDING_REVIEW)).toContain('yellow');
      expect(getStatusColor(SolutionStatus.APPROVED)).toContain('blue');
      expect(getStatusColor(SolutionStatus.READY_TO_PUBLISH)).toContain('purple');
      expect(getStatusColor(SolutionStatus.PUBLISHED)).toContain('green');
      expect(getStatusColor(SolutionStatus.SUSPENDED)).toContain('orange');
    });
  });

  describe('validateSolutionCompleteness', () => {
    it('应该验证方案标题长度', () => {
      const solution = {
        title: 'Test',
        description: 'This is a valid description with enough characters',
        price: 1000,
      };
      
      expect(() => validateSolutionCompleteness(solution)).toThrow('标题不能少于5个字符');
    });

    it('应该验证方案描述长度', () => {
      const solution = {
        title: 'Valid Solution Title',
        description: 'Short',
        price: 1000,
      };
      
      expect(() => validateSolutionCompleteness(solution)).toThrow('描述不能少于20个字符');
    });

    it('应该验证方案价格', () => {
      const solution = {
        title: 'Valid Solution Title',
        description: 'This is a valid description with enough characters',
        price: -1,
      };
      
      expect(() => validateSolutionCompleteness(solution)).toThrow('价格');
    });

    it('应该通过完整的方案验证', () => {
      const solution = {
        title: 'Valid Solution Title',
        description: 'This is a valid description with enough characters',
        price: 1000,
      };
      
      expect(validateSolutionCompleteness(solution)).toBe(true);
    });
  });

  describe('canEditSolution', () => {
    it('应该允许管理员编辑任何方案', () => {
      const solution = {
        id: '1',
        creatorId: 'creator-1',
        status: SolutionStatus.PUBLISHED,
      };
      const admin = {
        id: 'admin-1',
        roles: ['ADMIN'],
      };
      
      expect(canEditSolution(solution, admin)).toBe(true);
    });

    it('应该允许创作者编辑自己的草稿方案', () => {
      const solution = {
        id: '1',
        creatorId: 'creator-1',
        status: SolutionStatus.DRAFT,
      };
      const creator = {
        id: 'creator-1',
        roles: ['CREATOR'],
      };
      
      // 注意：实际使用时需要比较 creatorId
      // 这里测试逻辑结构
      expect(canEditSolution(solution, creator)).toBe(true);
    });

    it('应该允许创作者编辑自己的已拒绝方案', () => {
      const solution = {
        id: '1',
        creatorId: 'creator-1',
        status: SolutionStatus.REJECTED,
      };
      const creator = {
        id: 'creator-1',
        roles: ['CREATOR'],
      };
      
      expect(canEditSolution(solution, creator)).toBe(true);
    });

    it('应该拒绝未授权用户编辑方案', () => {
      const solution = {
        id: '1',
        creatorId: 'creator-1',
        status: SolutionStatus.DRAFT,
      };
      
      expect(canEditSolution(solution, null)).toBe(false);
    });
  });

  describe('canReviewSolution', () => {
    it('应该允许审核员审核待审核方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.PENDING_REVIEW,
      };
      const reviewer = {
        id: 'reviewer-1',
        roles: ['REVIEWER'],
      };
      
      expect(canReviewSolution(solution, reviewer)).toBe(true);
    });

    it('应该拒绝审核已发布方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.PUBLISHED,
      };
      const reviewer = {
        id: 'reviewer-1',
        roles: ['REVIEWER'],
      };
      
      expect(canReviewSolution(solution, reviewer)).toBe(false);
    });
  });

  describe('canPublishSolution', () => {
    it('应该允许管理员发布已通过方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.APPROVED,
      };
      const admin = {
        id: 'admin-1',
        roles: ['ADMIN'],
      };
      
      expect(canPublishSolution(solution, admin)).toBe(true);
    });

    it('应该拒绝发布非已通过方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.DRAFT,
      };
      const admin = {
        id: 'admin-1',
        roles: ['ADMIN'],
      };
      
      expect(canPublishSolution(solution, admin)).toBe(false);
    });
  });

  describe('canViewSolution', () => {
    it('应该允许公共用户查看已发布方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.PUBLISHED,
      };
      
      expect(canViewSolution(solution, null)).toBe(true);
    });

    it('应该拒绝公共用户查看未发布方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.DRAFT,
      };
      
      expect(canViewSolution(solution, null)).toBe(false);
    });

    it('应该允许管理员查看所有方案', () => {
      const solution = {
        id: '1',
        status: SolutionStatus.DRAFT,
      };
      const admin = {
        id: 'admin-1',
        roles: ['ADMIN'],
      };
      
      expect(canViewSolution(solution, admin)).toBe(true);
    });

    it('应该允许创作者查看自己的方案', () => {
      const solution = {
        id: '1',
        creatorId: 'creator-1',
        status: SolutionStatus.DRAFT,
      };
      const creator = {
        id: 'creator-1',
        roles: ['CREATOR'],
      };
      
      expect(canViewSolution(solution, creator, 'creator-1')).toBe(true);
    });
  });

  describe('STATUS_TRANSITIONS', () => {
    it('应该包含所有必需的状态转换规则', () => {
      const transitions = STATUS_TRANSITIONS;
      
      // 检查关键转换是否存在
      expect(transitions.some(t => 
        t.from === SolutionStatus.DRAFT && t.to === SolutionStatus.PENDING_REVIEW
      )).toBe(true);
      
      expect(transitions.some(t => 
        t.from === SolutionStatus.READY_TO_PUBLISH && t.to === SolutionStatus.PUBLISHED
      )).toBe(true);
      
      expect(transitions.some(t => 
        t.from === SolutionStatus.PUBLISHED && t.to === SolutionStatus.SUSPENDED
      )).toBe(true);
      
      expect(transitions.some(t => 
        t.from === SolutionStatus.SUSPENDED && t.to === SolutionStatus.PUBLISHED
      )).toBe(true);
    });
  });
});

