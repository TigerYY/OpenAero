'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { SecurityAlertNotification } from '@/components/security/SecurityAlerts';
import { CartButton } from '@/components/shop/CartButton';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Logo } from '@/components/ui/Logo';
import { saveLanguagePreference } from '@/lib/i18n-utils';
import { Locale } from '@/types/i18n';


import { MobileMenu } from './MobileMenu';

interface HeaderProps {
  locale?: string;
}

export function Header({ locale: propLocale }: HeaderProps = {}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations();
  const contextLocale = useLocale();
  const locale = propLocale || contextLocale;
  const router = useRouter();
  const pathname = usePathname();

  // 确保组件在客户端挂载后才渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navigation = [
    { name: t('navigation.solutions'), href: `/${locale}/solutions` },
    { name: t('navigation.shop'), href: `/${locale}/shop` },
    { name: t('navigation.creators'), href: `/${locale}/creators` },
    { name: t('navigation.about'), href: `/${locale}/about` },
    { name: t('navigation.contact'), href: `/${locale}/contact` },
  ];

  const switchLanguage = (newLocale: Locale) => {
    saveLanguagePreference(newLocale);
    
    // 使用 usePathname 获取当前路径，避免服务端渲染问题
    const currentPath = pathname || '/';
    
    // 确保路径以当前locale开头
    const pathWithoutLocale = currentPath.startsWith(`/${locale}`) 
      ? currentPath.slice(`/${locale}`.length) 
      : currentPath;
    
    // 构建新的路径
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
  };

  // 在客户端挂载前显示简单的加载状态
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-secondary-200">
        <div className="container">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
          <div className="flex items-center">
            <Logo size="md" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-16 sm:w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-12 sm:w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </header>
  );
}

return (
  <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-secondary-200" suppressHydrationWarning>
    <div className="container">
      <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-secondary-600 hover:text-primary-600 transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Tablet Navigation - Simplified */}
          <nav className="hidden md:flex lg:hidden items-center space-x-4">
            {navigation.slice(0, 3).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-secondary-600 hover:text-primary-600 transition-colors duration-200 text-sm"
              >
                {item.name}
              </Link>
            ))}
            <button
              type="button"
              className="text-secondary-600 hover:text-primary-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">{t('common.more')}</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                />
              </svg>
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            <SecurityAlertNotification />
            <CartButton variant="ghost" size="sm" />
            <LanguageSwitcher
              currentLocale={locale as Locale}
              onLocaleChange={switchLanguage}
              variant="dropdown"
              size="sm"
              showFlags={true}
              showNativeNames={true}
              className="mr-2"
            />
            <Button variant="ghost" asChild>
              <Link href={`/${locale}/contact`}>{t('navigation.contact')}</Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/creators/apply`}>{t('navigation.creators')}</Link>
            </Button>
          </div>

          {/* Tablet CTA - Simplified */}
          <div className="hidden md:flex lg:hidden items-center space-x-2">
            <SecurityAlertNotification />
            <CartButton variant="ghost" size="sm" />
            <LanguageSwitcher
              currentLocale={locale as Locale}
              onLocaleChange={switchLanguage}
              variant="dropdown"
              size="sm"
              showFlags={true}
              showNativeNames={false}
              className="min-w-[3rem] max-w-[5rem] flex-shrink-0"
            />
          </div>

          {/* Mobile menu button and language switcher */}
          <div className="md:hidden flex items-center space-x-2">
            <SecurityAlertNotification />
            <CartButton variant="ghost" size="sm" />
            <LanguageSwitcher
              currentLocale={locale as Locale}
              onLocaleChange={switchLanguage}
              variant="dropdown"
              size="sm"
              showFlags={true}
              showNativeNames={false}
              className="min-w-[4rem] max-w-[6rem] flex-shrink-0"
            />
            <button
              type="button"
              className="text-secondary-600 hover:text-primary-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">{t('common.openMenu')}</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigation}
      />
    </header>
  );
}
