import dynamic from 'next/dynamic';

// 动态导入 ClientHeader，禁用 SSR
const ClientHeader = dynamic(() => import('./ClientHeader').then(mod => ({ default: mod.ClientHeader })), {
  ssr: false,
  loading: () => null // 让 Suspense 处理加载状态
});

export function DynamicHeader() {
  return <ClientHeader />;
}
