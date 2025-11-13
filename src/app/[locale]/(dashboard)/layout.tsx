import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard布局
 * 用于用户个人中心相关页面（profile、settings等）
 * 注意：路由组 (dashboard) 不会影响URL路径
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}
