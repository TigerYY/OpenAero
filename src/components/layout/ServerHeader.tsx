import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/lib/routing';

import { ClientLanguageSwitcher } from './ClientLanguageSwitcher';
import { ClientMobileMenu } from './ClientMobileMenu';

interface ServerHeaderProps {
  locale: string;
}

export async function ServerHeader({ locale }: ServerHeaderProps) {
  const t = await getTranslations({ locale });

  const navigation = [
    { name: t('navigation.solutions'), href: `/${locale}${ROUTES.BUSINESS.SOLUTIONS}` },
    { name: t('navigation.creators'), href: `/${locale}${ROUTES.BUSINESS.CREATORS_APPLY}` },
    { name: t('navigation.about'), href: `/${locale}/about` },
    { name: t('navigation.contact'), href: `/${locale}${ROUTES.BUSINESS.CONTACT}` },
  ];

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
            <ClientLanguageSwitcher currentLocale={locale} />
            <Button variant="ghost" asChild>
              <Link href={`/${locale}${ROUTES.BUSINESS.CONTACT}`}>{t('navigation.contact')}</Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}${ROUTES.BUSINESS.CREATORS_APPLY}`}>{t('navigation.creators')}</Link>
            </Button>
          </div>

          {/* Mobile menu button and language switcher */}
          <div className="md:hidden flex items-center space-x-2">
            <ClientLanguageSwitcher currentLocale={locale} variant="button" size="sm" showFlags={true} />
            <ClientMobileMenu navigation={navigation} />
          </div>
        </div>
      </div>
    </header>
  );
}
