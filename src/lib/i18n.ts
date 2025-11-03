import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/types/i18n';

// 验证语言代码是否支持
export function isValidLocale(locale: string): locale is 'zh-CN' | 'en-US' {
  return SUPPORTED_LOCALES.includes(locale as 'zh-CN' | 'en-US');
}

// 获取默认语言
export function getDefaultLocale(): 'zh-CN' | 'en-US' {
  return DEFAULT_LOCALE;
}

// 获取支持的语言列表
export function getSupportedLocales(): string[] {
  return SUPPORTED_LOCALES;
}

// 语言检测和验证
export function detectLocale(requestedLocale?: string): 'zh-CN' | 'en-US' {
  if (requestedLocale && isValidLocale(requestedLocale)) {
    return requestedLocale;
  }
  return DEFAULT_LOCALE;
}

// 服务器端语言检测
export function detectServerLocale(request: Request): 'zh-CN' | 'en-US' {
  const acceptLanguage = request.headers.get('accept-language');
  
  if (acceptLanguage) {
    // 解析 Accept-Language 头
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, qValue] = lang.trim().split(';q=');
        return {
          locale: locale?.split('-')[0] || '', // 只取主要语言部分
          quality: qValue ? parseFloat(qValue) : 1.0
        };
      })
      .sort((a, b) => b.quality - a.quality);

    // 查找支持的语言
    for (const { locale } of languages) {
      if (locale && (locale === 'zh' || locale === 'zh-CN')) {
        return 'zh-CN';
      }
      if (locale && (locale === 'en' || locale === 'en-US')) {
        return 'en-US';
      }
    }
  }

  return DEFAULT_LOCALE;
}

// next-intl 配置
export default getRequestConfig(async ({ locale }) => {
  // 验证语言代码
  if (!locale || !isValidLocale(locale)) {
    notFound();
  }

  // 动态导入翻译文件
  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    // 回退到默认语言
    if (locale !== DEFAULT_LOCALE) {
      try {
        messages = (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default;
      } catch (fallbackError) {
        console.error(`Failed to load fallback messages:`, fallbackError);
        messages = {};
      }
    } else {
      messages = {};
    }
  }

  return {
    locale,
    messages,
    timeZone: 'Asia/Shanghai', // 默认时区
    now: new Date(),
  };
});

// 客户端语言检测
export function detectClientLocale(): 'zh-CN' | 'en-US' {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  // 从 localStorage 获取保存的语言偏好
  const savedLocale = localStorage.getItem('openaero-locale');
  if (savedLocale && isValidLocale(savedLocale)) {
    return savedLocale;
  }

  // 从浏览器语言检测
  const browserLanguage = navigator.language;
  if (browserLanguage.startsWith('zh')) {
    return 'zh-CN';
  }
  if (browserLanguage.startsWith('en')) {
    return 'en-US';
  }

  return DEFAULT_LOCALE;
}

// 保存语言偏好到 localStorage
export function saveClientLocale(locale: 'zh-CN' | 'en-US'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('openaero-locale', locale);
  }
}

// 获取语言偏好
export function getClientLocale(): 'zh-CN' | 'en-US' {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const savedLocale = localStorage.getItem('openaero-locale');
  return savedLocale && isValidLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE;
}

// 翻译键验证
export function validateTranslationKey(key: string): boolean {
  // 基本验证：键应该包含点号分隔的命名空间
  return typeof key === 'string' && key.includes('.') && key.length > 0;
}

// 获取翻译键的命名空间
export function getTranslationNamespace(key: string): string {
  return key.split('.')[0] || '';
}

// 获取翻译键的路径
export function getTranslationPath(key: string): string {
  return key.split('.').slice(1).join('.');
}
