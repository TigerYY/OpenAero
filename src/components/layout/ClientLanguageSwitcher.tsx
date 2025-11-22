'use client';

import { usePathname, useRouter } from 'next/navigation';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { saveLanguagePreference } from '@/lib/i18n-utils';
import { Locale } from '@/types/i18n';

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

  const switchLanguage = (newLocale: Locale) => {
    saveLanguagePreference(newLocale);

    // 使用 usePathname 获取当前路径
    const currentPath = pathname || '/';

    // 移除任何语言前缀（支持 zh-CN 和 en-US）
    let pathWithoutLocale = currentPath;
    if (currentPath.startsWith('/zh-CN')) {
      pathWithoutLocale = currentPath.replace(/^\/zh-CN/, '') || '/';
    } else if (currentPath.startsWith('/en-US')) {
      pathWithoutLocale = currentPath.replace(/^\/en-US/, '') || '/';
    }

    // 确保路径以 / 开头
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale;
    }

    // 构建新的路径（如果路径是 /，则不添加额外的 /）
    const newPath =
      pathWithoutLocale === '/' ? `/${newLocale}` : `/${newLocale}${pathWithoutLocale}`;

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
