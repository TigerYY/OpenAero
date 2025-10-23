import { loadMessagesSync, detectLocaleFromReq } from './i18n';
import { cookies } from 'next/headers';

export function getLocaleFromServer(): 'zh' | 'en' {
  try {
    const c = cookies();
    const cookie = c.get('locale')?.value;
    if (cookie === 'en') return 'en';
  } catch (e) {
    // ignore
  }
  return 'zh';
}

export function getServerMessages(): Record<string, any> {
  const locale = getLocaleFromServer();
  return loadMessagesSync(locale);
}

export function getServerMessagesFor(locale: 'zh' | 'en') {
  return loadMessagesSync(locale);
}
