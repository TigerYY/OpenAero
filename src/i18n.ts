import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { APP_CONFIG } from './config/app';

// 语言文件映射
const messages = {
  'zh-CN': () => import('../messages/zh-CN.json'),
  'en-US': () => import('../messages/en-US.json'),
} as const;

export default getRequestConfig(async ({ locale }) => {
  // 使用默认语言如果locale未定义
  const validLocale = locale || APP_CONFIG.defaultLocale;
  
  // 验证语言参数
  if (!APP_CONFIG.supportedLocales.includes(validLocale as any)) {
    notFound();
  }

  return {
    locale: validLocale,
    messages: (await messages[validLocale as keyof typeof messages]()).default,
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  };
});