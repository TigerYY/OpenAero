import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to default locale
  redirect('/zh-CN');
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';
