/**
 * DashboardCharts组件测试
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardCharts } from '../DashboardCharts';

// Mock fetch
global.fetch = jest.fn();

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('DashboardCharts', () => {
  const mockChartData = {
    trends: [
      { date: '2024-01-01', solutions: 10, users: 5 },
      { date: '2024-01-02', solutions: 15, users: 8 },
    ],
    categoryDistribution: [
      { name: '分类1', value: 10, percentage: 50 },
      { name: '分类2', value: 10, percentage: 50 },
    ],
    statusDistribution: [
      { status: 'ACTIVE', name: '活跃', count: 20 },
      { status: 'PENDING', name: '待审核', count: 10 },
    ],
    revenueTrend: [
      { date: '2024-01-01', revenue: 1000 },
      { date: '2024-01-02', revenue: 2000 },
    ],
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('应该显示加载状态', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // 永不resolve，保持加载状态
    );

    render(<DashboardCharts timeRange={30} />);
    expect(screen.getByRole('status') || screen.getByText(/加载|loading/i)).toBeDefined();
  });

  it('应该显示图表数据', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockChartData,
      }),
    });

    render(<DashboardCharts timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeDefined();
    });
  });

  it('应该处理错误状态', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: '获取图表数据失败',
      }),
    });

    render(<DashboardCharts timeRange={30} />);

    await waitFor(() => {
      expect(screen.getByText(/失败|error/i)).toBeDefined();
    });
  });
});

