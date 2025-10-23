import { APP_CONFIG } from '@/config/app';
import { LanguageConfig, Locale } from '@/types/i18n';

// 语言配置
export const languageConfigs: LanguageConfig[] = [
  {
    locale: 'zh-CN',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    direction: 'ltr',
  },
  {
    locale: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
];

// 获取语言配置
export function getLanguageConfig(locale: Locale): LanguageConfig | undefined {
  return languageConfigs.find(config => config.locale === locale);
}

// 获取语言显示名称
export function getLanguageDisplayName(locale: Locale): string {
  const config = getLanguageConfig(locale);
  return config?.name || locale;
}

// 获取语言本地名称
export function getLanguageNativeName(locale: Locale): string {
  const config = getLanguageConfig(locale);
  return config?.nativeName || locale;
}

// 获取语言旗帜
export function getLanguageFlag(locale: Locale): string {
  const config = getLanguageConfig(locale);
  return config?.flag || '🌐';
}

// 检测客户端语言
export function detectClientLanguage(): Locale {
  if (typeof window === 'undefined') {
    return APP_CONFIG.defaultLocale;
  }

  // 检查localStorage
  const stored = localStorage.getItem('openaero-locale');
  if (stored && APP_CONFIG.supportedLocales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // 检测浏览器语言
  const browserLang = navigator.language;
  const matchedLocale = APP_CONFIG.supportedLocales.find(locale => 
    browserLang.startsWith(locale)
  );

  return matchedLocale || APP_CONFIG.defaultLocale;
}

// 保存语言偏好
export function saveLanguagePreference(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('openaero-locale', locale);
  }
}

// 验证语言代码
export function isValidLocale(locale: string): locale is Locale {
  return APP_CONFIG.supportedLocales.includes(locale as Locale);
}
