import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/test',
}));

const TestComponent = () => <div>保护的内容</div>;

describe('AuthGuard组件测试', () => {
  const mockUseAuth = useAuth as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示加载状态', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByText('保护的内容')).not.toBeInTheDocument();
  });

  it('应该允许已认证用户访问', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'CUSTOMER' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('保护的内容')).toBeInTheDocument();
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
  });

  it('应该重定向未认证用户到登录页', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    expect(mockPush).toHaveBeenCalledWith('/auth/login');
    expect(screen.queryByText('保护的内容')).not.toBeInTheDocument();
  });

  it('应该检查用户角色权限', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'CUSTOMER' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard requiredRole="ADMIN">
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('权限不足')).toBeInTheDocument();
    expect(screen.queryByText('保护的内容')).not.toBeInTheDocument();
  });

  it('应该允许具有足够权限的用户访问', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard requiredRole="ADMIN">
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('保护的内容')).toBeInTheDocument();
  });

  it('应该处理权限检查错误', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'INVALID_ROLE' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard requiredRole="ADMIN">
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('权限检查错误')).toBeInTheDocument();
  });

  it('应该支持自定义未认证重定向', () => {
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
    });

    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard redirectTo="/custom-login">
        <TestComponent />
      </AuthGuard>
    );

    expect(mockReplace).toHaveBeenCalledWith('/custom-login');
  });

  it('应该支持自定义权限不足消息', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'CUSTOMER' },
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <AuthGuard 
        requiredRole="ADMIN" 
        fallback={<div>自定义权限不足消息</div>}
      >
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('自定义权限不足消息')).toBeInTheDocument();
  });
});

describe('AuthGuard集成测试', () => {
  it('应该与登录表单正确交互', async () => {
    const { user } = setup();
    
    // 初始状态：未认证
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    // 应该显示登录表单
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();

    // 模拟登录
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    // 模拟认证成功
    await waitFor(() => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', role: 'CUSTOMER' },
        isLoading: false,
        isAuthenticated: true,
      });
    });

    // 应该显示保护的内容
    expect(screen.getByText('保护的内容')).toBeInTheDocument();
  });

  it('应该处理认证过期', async () => {
    // 初始认证状态
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'CUSTOMER' },
      isLoading: false,
      isAuthenticated: true,
    });

    const { unmount } = render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    expect(screen.getByText('保护的内容')).toBeInTheDocument();

    // 模拟认证过期
    unmount();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    );

    // 应该重定向到登录页
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });
});