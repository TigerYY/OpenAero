'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeConfig, type Locale } from '@/i18n';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    // 移除当前语言前缀，获取不带语言前缀的路径
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    // 构建新的路径
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <div className="relative">
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
      {/* 自定义下拉箭头 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary-500">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
