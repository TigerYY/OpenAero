'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              验证成功！
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              您的帐户已成功创建并通过验证。您现在可以开始使用我们的服务了。
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/profile">
                前往个人中心
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
