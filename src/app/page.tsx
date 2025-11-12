import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to default locale (zh-CN)
  redirect('/zh-CN');
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Ensure this is treated as a dynamic route
export const revalidate = 0;
