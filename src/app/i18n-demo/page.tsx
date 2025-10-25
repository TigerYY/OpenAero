import { getServerMessages } from '@/lib/server-i18n';

export default async function Page() {
  const msgs = await getServerMessages();
  const welcome = msgs?.common?.labels?.welcome || '欢迎';

  return (
    <main style={{ padding: 24 }}>
      <h1>{welcome}</h1>
      <p>这是一个服务端渲染的 i18n 演示页面。若浏览器 cookie 中设置 locale=en，则会显示英文。</p>
    </main>
  );
}
