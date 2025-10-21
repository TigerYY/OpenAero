import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// 支持的语言列表
export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

// 默认语言
export const defaultLocale: Locale = 'zh';

// 语言配置
export const localeConfig = {
  zh: {
    name: '简体中文',
    flag: '🇨🇳',
    dir: 'ltr' as const,
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr' as const,
  },
};

export default getRequestConfig(async ({ locale }) => {
  // 验证语言是否支持，如果不支持则使用默认语言
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
