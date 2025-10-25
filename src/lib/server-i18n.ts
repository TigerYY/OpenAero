import { cookies } from 'next/headers';

export function getLocaleFromServer(): 'zh-CN' | 'en-US' {
  try {
    const c = cookies();
    const cookie = c.get('locale')?.value;
    if (cookie === 'en-US') return 'en-US';
  } catch (e) {
    // ignore
  }
  return 'zh-CN';
}

export async function getServerMessages(): Promise<Record<string, any>> {
  const locale = getLocaleFromServer();
  return await getServerMessagesFor(locale);
}

export async function getServerMessagesFor(locale: 'zh-CN' | 'en-US'): Promise<Record<string, any>> {
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    return {};
  }
}
