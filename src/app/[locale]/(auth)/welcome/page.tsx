'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function WelcomePage() {
  const params = useParams();
  const locale = params.locale || 'zh-CN';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              {locale === 'zh-CN' ? '验证成功！' : 'Verification Successful!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              {locale === 'zh-CN' 
                ? '您的帐户已成功创建并通过验证。您现在可以开始使用我们的服务了。'
                : 'Your account has been successfully created and verified. You can now start using our services.'}
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href={`/${locale}/profile`}>
                {locale === 'zh-CN' ? '前往个人中心' : 'Go to Profile'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
