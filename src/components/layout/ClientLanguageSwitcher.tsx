'use client';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { saveLanguagePreference } from '@/lib/i18n-utils';
import { Locale } from '@/types/i18n';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

interface ClientLanguageSwitcherProps {
  currentLocale: string;
  variant?: 'dropdown' | 'button';
  size?: 'sm' | 'md' | 'lg';
  showFlags?: boolean;
  showNativeNames?: boolean;
  className?: string;
}

export function ClientLanguageSwitcher({
  currentLocale,
  variant = 'dropdown',
  size = 'md',
  showFlags = true,
  showNativeNames = true,
  className = '',
}: ClientLanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const switchLanguage = (newLocale: Locale) => {
    saveLanguagePreference(newLocale);
    
    // 使用 usePathname 获取当前路径，避免服务端渲染问题
    const currentPath = pathname;
    
    // 确保路径以当前locale开头
    const pathWithoutLocale = currentPath.startsWith(`/${locale}`) 
      ? currentPath.slice(`/${locale}`.length) 
      : currentPath;
    
    // 构建新的路径
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
  };

  return (
    <LanguageSwitcher
      currentLocale={currentLocale as Locale}
      onLocaleChange={switchLanguage}
      variant={variant === 'button' ? 'buttons' : variant}
      size={size}
      showFlags={showFlags}
      showNativeNames={showNativeNames}
      className={className}
    />
  );
}
