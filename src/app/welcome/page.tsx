'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /welcome 重定向页面
 * 自动跳转到带语言前缀的欢迎页面
 * 解决 Supabase 邮件验证链接 404 问题
 */
export default function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 从 cookie 获取用户语言偏好
    const locale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || 'zh-CN';
    
    console.log('[Welcome Redirect] 检测到语言:', locale);
    console.log('[Welcome Redirect] 重定向到:', `/${locale}/auth/welcome`);
    
    // 重定向到带语言前缀的欢迎页面
    router.replace(`/${locale}/auth/welcome`);
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#666' }}>Redirecting... / 正在跳转...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
