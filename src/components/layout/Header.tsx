'use client';

import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Logo } from '@/components/ui/Logo';
import { saveLanguagePreference } from '@/lib/i18n-utils';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const navigation = [
    { name: t('navigation.solutions'), href: '/solutions' },
    { name: t('navigation.creators'), href: '/creators' },
    { name: t('navigation.about'), href: '/about' },
    { name: t('navigation.contact'), href: '/contact' },
  ];

  const switchLanguage = (newLocale: string) => {
    saveLanguagePreference(newLocale as any);
    const currentPath = window.location.pathname;
    
    // 确保路径以当前locale开头
    const pathWithoutLocale = currentPath.startsWith(`/${locale}`) 
      ? currentPath.slice(`/${locale}`.length) 
      : currentPath;
    
    // 构建新的路径
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    console.log('Switching language:', { currentPath, newPath, locale, newLocale });
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
              currentLocale={locale}
              onLocaleChange={switchLanguage}
              variant="dropdown"
              size="sm"
              showFlags={true}
              showNativeNames={true}
              className="mr-2"
            />
            <Button variant="ghost" asChild>
              <Link href="/contact">{t('navigation.contact')}</Link>
            </Button>
            <Button asChild>
              <Link href="/creators/apply">{t('navigation.creators')}</Link>
            </Button>
          </div>

          {/* Mobile menu button and language switcher */}
          <div className="md:hidden flex items-center space-x-2">
            <LanguageSwitcher
              currentLocale={locale}
              onLocaleChange={switchLanguage}
              variant="dropdown"
              size="sm"
              showFlags={true}
              showNativeNames={false}
              className="w-20"
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
