const CACHE_VERSION = '1.0.0';
const STATIC_CACHE_NAME = `openaero-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `openaero-dynamic-v${CACHE_VERSION}`;
const CACHE_NAME = STATIC_CACHE_NAME; // 保持向后兼容

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png'
];

// API 缓存模式配置
const API_CACHE_PATTERNS = [
  /^\/api\/solutions/,
  /^\/api\/creators/,
  /^\/api\/categories/,
  /^\/api\/user\/profile/
];

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：缓存优先
  static: 'cache-first',
  // API 数据：网络优先，失败时使用缓存
  api: 'network-first',
  // 页面：网络优先，失败时使用缓存
  pages: 'network-first',
  // 图片：缓存优先
  images: 'cache-first'
};

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // 处理导航请求
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 处理 API 请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 处理静态资源请求
  event.respondWith(handleStaticRequest(request));
});

// 处理导航请求（页面请求）
async function handleNavigationRequest(request) {
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 缓存成功的响应
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);
    
    // 尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 返回离线页面
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // 最后的备选方案
    return new Response('离线状态，请检查网络连接', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 处理 API 请求
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // 检查是否是需要缓存的 API
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCache) {
      // 缓存成功的 API 响应
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: API request failed, trying cache', error);
    
    if (shouldCache) {
      // 尝试从缓存获取
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // 返回错误响应
    return new Response(JSON.stringify({
      error: '网络连接失败',
      message: '请检查网络连接后重试',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// 处理静态资源请求
async function handleStaticRequest(request) {
  try {
    // 先尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 从网络获取
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 缓存静态资源
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static request failed', error);
    
    // 返回通用错误响应
    return new Response('资源加载失败', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// 推送通知事件
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'OpenAero 通知',
    body: '您有新的消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  // 解析推送数据
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // 显示通知
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions || [
        {
          action: 'view',
          title: '查看',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: '关闭',
          icon: '/icons/close-icon.png'
        }
      ],
      requireInteraction: false,
      silent: false
    })
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // 关闭通知
  notification.close();

  if (action === 'dismiss') {
    return;
  }

  // 处理通知点击
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = data.url || '/';
        
        // 查找已打开的窗口
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 处理后台同步
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  try {
    // 这里可以执行一些后台任务
    // 比如同步离线时的数据、更新缓存等
    console.log('Service Worker: Performing background sync');
    
    // 示例：清理过期缓存
    await cleanupExpiredCache();
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// 清理过期缓存
async function cleanupExpiredCache() {
  const cacheNames = await caches.keys();
  const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
  const requests = await dynamicCache.keys();
  
  // 删除超过 7 天的缓存项
  const expireTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const request of requests) {
    const response = await dynamicCache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        if (responseDate < expireTime) {
          await dynamicCache.delete(request);
          console.log('Service Worker: Deleted expired cache', request.url);
        }
      }
    }
  }
}

// 监听消息
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});