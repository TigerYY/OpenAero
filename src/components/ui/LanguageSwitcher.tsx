"use client";

import React from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeConfig, type Locale } from '@/i18n';

/**
 * LanguageSwitcher (named export)
 * - Uses next-intl's `useLocale` to determine current locale
 * - Navigates using next/navigation router to switch locale-prefixed routes
 * - Keeps logic explicit: `zh` is represented without prefix, `en` with `/en` prefix
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname() || '/';

  const handleLanguageChange = (newLocale: Locale) => {
    const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
    const newPath = newLocale === 'zh' ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="appearance-none bg-white border border-secondary-300 rounded-md px-3 py-1 text-sm text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-8 cursor-pointer"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeConfig[loc].flag} {localeConfig[loc].name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
