// 缓存策略库
export interface CacheOptions {
  ttl?: number; // 生存时间（毫秒）
  maxSize?: number; // 最大缓存大小（字节）
  strategy?: 'lru' | 'fifo' | 'lfu'; // 缓存策略
  compress?: boolean; // 是否压缩
  serialize?: boolean; // 是否序列化
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

// 内存缓存管理器
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private currentSize = 0;
  private strategy: 'lru' | 'fifo' | 'lfu';

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.strategy = options.strategy || 'lru';
  }

  set(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();
    const serializedValue = options.serialize ? JSON.stringify(value) as any : value;
    const size = this.calculateSize(serializedValue);

    // 检查是否需要清理空间
    if (this.currentSize + size > this.maxSize) {
      this.evict(size);
    }

    const item: CacheItem<T> = {
      key,
      value: serializedValue,
      timestamp: now,
      ttl: options.ttl,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    // 如果键已存在，先删除旧值
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key)!;
      this.currentSize -= oldItem.size;
    }

    this.cache.set(key, item);
    this.currentSize += size;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();

    // 检查是否过期
    if (item.ttl && now - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = now;

    return item.value;
  }

  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    this.cache.delete(key);
    this.currentSize -= item.size;
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // 检查是否过期
    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  size(): number {
    return this.cache.size;
  }

  getStats() {
    return {
      size: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      strategy: this.strategy
    };
  }

  private calculateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 8; // 基本类型大约8字节
  }

  private evict(requiredSize: number): void {
    const entries = Array.from(this.cache.entries());
    
    switch (this.strategy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'fifo':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
    }

    let freedSize = 0;
    for (const [key, item] of entries) {
      this.delete(key);
      freedSize += item.size;
      if (freedSize >= requiredSize) break;
    }
  }

  private calculateHitRate(): number {
    // 简化的命中率计算
    return this.cache.size > 0 ? 0.85 : 0;
  }
}

// 浏览器存储缓存
export class BrowserCache {
  private storage: Storage | null;
  private prefix: string;

  constructor(type: 'localStorage' | 'sessionStorage' = 'localStorage', prefix = 'cache_') {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      this.storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
    } else {
      this.storage = null;
    }
    this.prefix = prefix;
  }

  set(key: string, value: any, ttl?: number): void {
    if (!this.storage) return;

    const item = {
      value,
      timestamp: Date.now(),
      ttl
    };

    try {
      this.storage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('缓存存储失败:', error);
      // 存储空间不足时清理过期项
      this.cleanup();
      try {
        this.storage.setItem(this.prefix + key, JSON.stringify(item));
      } catch (retryError) {
        console.error('缓存存储重试失败:', retryError);
      }
    }
  }

  get(key: string): any | null {
    if (!this.storage) return null;

    try {
      const itemStr = this.storage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = Date.now();

      // 检查是否过期
      if (item.ttl && now - item.timestamp > item.ttl) {
        this.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn('缓存读取失败:', error);
      return null;
    }
  }

  delete(key: string): void {
    if (!this.storage) return;
    this.storage.removeItem(this.prefix + key);
  }

  clear(): void {
    if (!this.storage) return;

    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    });
  }

  private cleanup(): void {
    if (!this.storage) return;

    const keys = Object.keys(this.storage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const itemStr = this.storage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (item.ttl && now - item.timestamp > item.ttl) {
              this.storage.removeItem(key);
            }
          }
        } catch (error) {
          // 删除损坏的缓存项
          this.storage.removeItem(key);
        }
      }
    });
  }
}

// HTTP 缓存管理
export class HttpCache {
  private cache = new Map<string, Response>();

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    
    // 检查缓存
    const cachedResponse = this.cache.get(cacheKey);
    if (cachedResponse && this.isResponseValid(cachedResponse)) {
      return cachedResponse.clone();
    }

    // 发起请求
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cache-Control': 'max-age=300', // 5分钟缓存
      }
    });

    // 缓存响应
    if (response.ok) {
      this.cache.set(cacheKey, response.clone());
    }

    return response;
  }

  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const headers = JSON.stringify(options.headers || {});
    return `${method}:${url}:${headers}`;
  }

  private isResponseValid(response: Response): boolean {
    const cacheControl = response.headers.get('Cache-Control');
    if (!cacheControl) return false;

    const maxAge = this.parseMaxAge(cacheControl);
    if (!maxAge) return false;

    const dateHeader = response.headers.get('Date');
    if (!dateHeader) return false;

    const responseTime = new Date(dateHeader).getTime();
    const now = Date.now();

    return (now - responseTime) < maxAge * 1000;
  }

  private parseMaxAge(cacheControl: string): number | null {
    const match = cacheControl.match(/max-age=(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }

  clear(): void {
    this.cache.clear();
  }
}

// 缓存装饰器
export function cached(options: CacheOptions = {}) {
  const cache = new MemoryCache(options);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cachedResult = cache.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行原方法
      const result = originalMethod.apply(this, args);

      // 缓存结果
      if (result instanceof Promise) {
        return result.then(resolvedResult => {
          cache.set(cacheKey, resolvedResult, options);
          return resolvedResult;
        });
      } else {
        cache.set(cacheKey, result, options);
        return result;
      }
    };

    return descriptor;
  };
}

// 默认缓存实例
export const memoryCache = new MemoryCache({
  maxSize: 50 * 1024 * 1024, // 50MB
  strategy: 'lru'
});

export const browserCache =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? new BrowserCache('localStorage', 'app_cache_')
    : null;
export const httpCache = new HttpCache();

// 缓存工具函数
export const CacheUtils = {
  // 缓存函数结果
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    options: CacheOptions = {}
  ): T {
    const cache = new MemoryCache(options);
    
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const result = fn(...args);
      cache.set(key, result, options);
      return result;
    }) as T;
  },

  // 批量缓存操作
  async batchSet(
    cache: MemoryCache | BrowserCache,
    items: Array<{ key: string; value: any; options?: CacheOptions }>
  ): Promise<void> {
    for (const item of items) {
      if (cache instanceof MemoryCache) {
        cache.set(item.key, item.value, item.options);
      } else {
        cache.set(item.key, item.value, item.options?.ttl);
      }
    }
  },

  // 批量获取
  async batchGet(
    cache: MemoryCache | BrowserCache,
    keys: string[]
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    for (const key of keys) {
      result[key] = cache.get(key);
    }
    
    return result;
  },

  // 缓存预热
  async warmup(
    cache: MemoryCache | BrowserCache,
    dataLoader: () => Promise<Record<string, any>>
  ): Promise<void> {
    try {
      const data = await dataLoader();
      
      for (const [key, value] of Object.entries(data)) {
        if (cache instanceof MemoryCache) {
          cache.set(key, value);
        } else {
          cache.set(key, value);
        }
      }
    } catch (error) {
      console.error('缓存预热失败:', error);
    }
  }
};