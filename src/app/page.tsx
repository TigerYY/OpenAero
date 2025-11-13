import { redirect } from 'next/navigation';
import { RoutingUtils } from '@/lib/routing';

export default function RootPage() {
  // Redirect to default locale (zh-CN)
  const defaultLocale = 'zh-CN';
  const homeRoute = RoutingUtils.generateRoute(defaultLocale, '/');
  redirect(homeRoute);
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Ensure this is treated as a dynamic route
export const revalidate = 0;
