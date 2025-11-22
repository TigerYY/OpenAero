'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Logo } from '@/components/ui/Logo';
import { saveLanguagePreference } from '@/lib/i18n-utils';
import { useRouting } from '@/lib/routing';
import { Locale } from '@/types/i18n';

import { MobileMenu } from './MobileMenu';

export function ClientHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { route, routes } = useRouting();

  const navigation = [
    { name: t('navigation.solutions'), href: route(routes.BUSINESS.SOLUTIONS) },
    { name: t('navigation.creators'), href: route(routes.BUSINESS.CREATORS_APPLY) },
    { name: t('navigation.about'), href: route('/about') },
    { name: t('navigation.contact'), href: route(routes.BUSINESS.CONTACT) },
  ];

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
    const newPath = pathWithoutLocale === '/' 
      ? `/${newLocale}` 
      : `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-secondary-200">
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
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

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
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
              <Link href={route('/contact')}>{t('navigation.contact')}</Link>
            </Button>
            <Button asChild>
              <Link href={route('/creators/apply')}>{t('navigation.creators')}</Link>
            </Button>
          </div>

          {/* Mobile menu button and language switcher */}
          <div className="md:hidden flex items-center space-x-2">
            <LanguageSwitcher
              currentLocale={locale as Locale}
              onLocaleChange={switchLanguage}
              variant="buttons"
              size="sm"
              showFlags={true}
              className="mr-2"
            />
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-secondary-600 hover:text-primary-600 p-2"
              aria-label="打开菜单"
            >
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

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigation}
      />
    </header>
  );
}
