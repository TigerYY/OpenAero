// 语言类型
export type Locale = 'zh-CN' | 'en-US';

// 支持的语言列表
export const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'en-US'];

// 默认语言
export const DEFAULT_LOCALE: Locale = 'zh-CN';

// 翻译消息类型
export type Messages = Record<string, string | Record<string, string>>;

// 语言配置类型
export interface LanguageConfig {
  locale: Locale;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

// 语言切换器属性
export interface LanguageSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  variant?: 'dropdown' | 'buttons' | 'tabs';
  size?: 'sm' | 'md' | 'lg';
  showFlags?: boolean;
  showNativeNames?: boolean;
  showEnglishNames?: boolean;
  className?: string;
}

// 语言检测结果
export interface LanguageDetectionResult {
  locale: Locale;
  quality: number;
  source: 'localStorage' | 'browser' | 'default';
}

// 语言存储项
export interface LanguageHistoryItem {
  locale: Locale;
  timestamp: number;
  source: 'user' | 'detection' | 'fallback';
  userAgent?: string;
  referrer?: string;
}

// 语言统计
export type LanguageStats = {
  [K in Locale]: {
    count: number;
    lastUsed: number;
    totalTime: number;
  };
};

// 所有语言配置
export const ALL_LANGUAGE_CONFIGS: LanguageConfig[] = [
  { 
    locale: 'zh-CN', 
    name: 'Chinese', 
    nativeName: '中文', 
    flag: '🇨🇳',
    direction: 'ltr'
  },
  { 
    locale: 'en-US', 
    name: 'English', 
    nativeName: 'English', 
    flag: '🇺🇸',
    direction: 'ltr'
  }
];