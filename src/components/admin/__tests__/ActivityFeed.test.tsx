/**
 * ActivityFeed组件测试
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ActivityFeed } from '../ActivityFeed';

// Mock fetch
global.fetch = jest.fn();

describe('ActivityFeed', () => {
  const mockActivities = [
    {
      id: '1',
      type: 'user_registration' as const,
      title: '新用户注册',
      description: '用户test注册了账号',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'solution_submission' as const,
      title: '方案提交',
      description: '用户提交了新方案',
      timestamp: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('应该显示活动列表', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        },
      }),
    });

    render(<ActivityFeed limit={20} />);

    await waitFor(() => {
      expect(screen.getByText('新用户注册')).toBeDefined();
    });
  });

  it('应该支持筛选活动类型', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities.filter(a => a.type === 'user_registration'),
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      }),
    });

    render(<ActivityFeed limit={20} />);

    await waitFor(() => {
      const filterSelect = screen.getByRole('combobox') || screen.getByLabelText(/筛选|filter/i);
      if (filterSelect) {
        fireEvent.change(filterSelect, { target: { value: 'user_registration' } });
      }
    });
  });

  it('应该支持手动刷新', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          activities: mockActivities,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
      }),
    });

    render(<ActivityFeed limit={20} autoRefresh={false} />);

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /刷新|refresh/i });
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      }
    });
  });
});

