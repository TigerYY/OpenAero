import { Locale, SUPPORTED_LOCALES } from '@/types/i18n';

/**
 * 语言存储服务
 * 提供语言偏好的持久化存储功能
 */

// 存储键名常量
const STORAGE_KEYS = {
  LOCALE: 'openaero-locale',
  LANGUAGE_HISTORY: 'openaero-language-history',
  LANGUAGE_STATS: 'openaero-language-stats',
  LAST_DETECTED: 'openaero-last-detected-locale',
} as const;

// 存储配置
const STORAGE_CONFIG = {
  MAX_HISTORY_ITEMS: 50,
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24小时
  VERSION: '1.0.0',
} as const;

// 语言历史记录类型
export type LanguageHistoryItem = {
  locale: Locale;
  timestamp: number;
  source: 'user' | 'detection' | 'fallback';
  userAgent?: string;
  referrer?: string;
};

// 语言统计类型
export type LanguageStats = {
  [K in Locale]: {
    count: number;
    lastUsed: number;
    totalTime: number; // 总使用时间（毫秒）
  };
};

// 存储数据版本控制
export type StorageVersion = {
  version: string;
  timestamp: number;
};

class LanguageStorageService {
  private isClient = typeof window !== 'undefined';

  // 检查存储是否可用
  private isStorageAvailable(): boolean {
    if (!this.isClient) {
      return false;
    }

    try {
      const testKey = '__openaero_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // 获取存储版本
  private getStorageVersion(): StorageVersion {
    if (!this.isClient || !this.isStorageAvailable()) {
      return { version: STORAGE_CONFIG.VERSION, timestamp: Date.now() };
    }

    try {
      const versionData = localStorage.getItem('openaero-storage-version');
      if (versionData) {
        return JSON.parse(versionData);
      }
    } catch (error) {
      console.warn('Failed to get storage version:', error);
    }

    return { version: STORAGE_CONFIG.VERSION, timestamp: Date.now() };
  }

  // 设置存储版本
  private setStorageVersion(): void {
    if (!this.isClient || !this.isStorageAvailable()) {
      return;
    }

    try {
      const versionData: StorageVersion = {
        version: STORAGE_CONFIG.VERSION,
        timestamp: Date.now()
      };
      localStorage.setItem('openaero-storage-version', JSON.stringify(versionData));
    } catch (error) {
      console.warn('Failed to set storage version:', error);
    }
  }

  // 保存语言偏好
  saveLocale(locale: Locale): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    if (!SUPPORTED_LOCALES.includes(locale)) {
      console.warn(`Invalid locale: ${locale}`);
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.LOCALE, locale);
      this.setStorageVersion();
      return true;
    } catch (error) {
      console.error('Failed to save locale:', error);
      return false;
    }
  }

  // 获取语言偏好
  getLocale(): Locale | null {
    if (!this.isClient || !this.isStorageAvailable()) {
      return null;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCALE);
      if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
        return saved as Locale;
      }
    } catch (error) {
      console.warn('Failed to get locale:', error);
    }

    return null;
  }

  // 清除语言偏好
  clearLocale(): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.LOCALE);
      return true;
    } catch (error) {
      console.error('Failed to clear locale:', error);
      return false;
    }
  }

  // 保存语言历史记录
  saveLanguageHistory(item: LanguageHistoryItem): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const history = this.getLanguageHistory();
      history.push(item);

      // 限制历史记录数量
      if (history.length > STORAGE_CONFIG.MAX_HISTORY_ITEMS) {
        history.splice(0, history.length - STORAGE_CONFIG.MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(STORAGE_KEYS.LANGUAGE_HISTORY, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Failed to save language history:', error);
      return false;
    }
  }

  // 获取语言历史记录
  getLanguageHistory(): LanguageHistoryItem[] {
    if (!this.isClient || !this.isStorageAvailable()) {
      return [];
    }

    try {
      const historyData = localStorage.getItem(STORAGE_KEYS.LANGUAGE_HISTORY);
      if (historyData) {
        return JSON.parse(historyData);
      }
    } catch (error) {
      console.warn('Failed to get language history:', error);
    }

    return [];
  }

  // 清除语言历史记录
  clearLanguageHistory(): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.LANGUAGE_HISTORY);
      return true;
    } catch (error) {
      console.error('Failed to clear language history:', error);
      return false;
    }
  }

  // 更新语言统计
  updateLanguageStats(locale: Locale, duration: number = 0): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const stats = this.getLanguageStats();
      const now = Date.now();

      if (!stats[locale]) {
        stats[locale] = {
          count: 0,
          lastUsed: now,
          totalTime: 0
        };
      }

      stats[locale].count++;
      stats[locale].lastUsed = now;
      stats[locale].totalTime += duration;

      localStorage.setItem(STORAGE_KEYS.LANGUAGE_STATS, JSON.stringify(stats));
      return true;
    } catch (error) {
      console.error('Failed to update language stats:', error);
      return false;
    }
  }

  // 获取语言统计
  getLanguageStats(): LanguageStats {
    if (!this.isClient || !this.isStorageAvailable()) {
      return this.getDefaultStats();
    }

    try {
      const statsData = localStorage.getItem(STORAGE_KEYS.LANGUAGE_STATS);
      if (statsData) {
        const stats = JSON.parse(statsData);
        // 确保所有支持的语言都有统计记录
        return this.mergeWithDefaultStats(stats);
      }
    } catch (error) {
      console.warn('Failed to get language stats:', error);
    }

    return this.getDefaultStats();
  }

  // 获取默认统计
  private getDefaultStats(): LanguageStats {
    const stats = {} as LanguageStats;
    SUPPORTED_LOCALES.forEach(locale => {
      stats[locale] = {
        count: 0,
        lastUsed: 0,
        totalTime: 0
      };
    });
    return stats;
  }

  // 合并默认统计
  private mergeWithDefaultStats(stats: Partial<LanguageStats>): LanguageStats {
    const defaultStats = this.getDefaultStats();
    SUPPORTED_LOCALES.forEach(locale => {
      if (stats[locale]) {
        defaultStats[locale] = {
          count: stats[locale]?.count || 0,
          lastUsed: stats[locale]?.lastUsed || 0,
          totalTime: stats[locale]?.totalTime || 0
        };
      }
    });
    return defaultStats;
  }

  // 清除语言统计
  clearLanguageStats(): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.LANGUAGE_STATS);
      return true;
    } catch (error) {
      console.error('Failed to clear language stats:', error);
      return false;
    }
  }

  // 保存最后检测到的语言
  saveLastDetectedLocale(locale: Locale): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const data = {
        locale,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.LAST_DETECTED, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save last detected locale:', error);
      return false;
    }
  }

  // 获取最后检测到的语言
  getLastDetectedLocale(): Locale | null {
    if (!this.isClient || !this.isStorageAvailable()) {
      return null;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_DETECTED);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.locale && SUPPORTED_LOCALES.includes(parsed.locale)) {
          return parsed.locale;
        }
      }
    } catch (error) {
      console.warn('Failed to get last detected locale:', error);
    }

    return null;
  }

  // 清除所有语言相关数据
  clearAll(): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      localStorage.removeItem('openaero-storage-version');
      return true;
    } catch (error) {
      console.error('Failed to clear all language data:', error);
      return false;
    }
  }

  // 获取存储使用情况
  getStorageUsage(): {
    totalKeys: number;
    estimatedSize: number;
    version: string;
  } {
    if (!this.isClient || !this.isStorageAvailable()) {
      return { totalKeys: 0, estimatedSize: 0, version: STORAGE_CONFIG.VERSION };
    }

    let totalKeys = 0;
    let estimatedSize = 0;

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          totalKeys++;
          estimatedSize += key.length + value.length;
        }
      });

      const version = this.getStorageVersion();
      return {
        totalKeys,
        estimatedSize,
        version: version.version
      };
    } catch (error) {
      console.warn('Failed to get storage usage:', error);
      return { totalKeys: 0, estimatedSize: 0, version: STORAGE_CONFIG.VERSION };
    }
  }

  // 检查存储是否需要清理
  needsCleanup(): boolean {
    const usage = this.getStorageUsage();
    return usage.estimatedSize > 100 * 1024; // 100KB
  }

  // 清理过期数据
  cleanup(): boolean {
    if (!this.isClient || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const now = Date.now();
      const history = this.getLanguageHistory();
      
      // 清理超过30天的历史记录
      const filteredHistory = history.filter(item => 
        now - item.timestamp < 30 * 24 * 60 * 60 * 1000
      );

      if (filteredHistory.length !== history.length) {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE_HISTORY, JSON.stringify(filteredHistory));
      }

      return true;
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
      return false;
    }
  }
}

// 创建单例实例
const languageStorageService = new LanguageStorageService();

// 导出服务实例和便捷函数
export default languageStorageService;

// 便捷函数
export const saveLocale = (locale: Locale) => languageStorageService.saveLocale(locale);
export const getLocale = () => languageStorageService.getLocale();
export const clearLocale = () => languageStorageService.clearLocale();
export const saveLanguageHistory = (item: LanguageHistoryItem) => languageStorageService.saveLanguageHistory(item);
export const getLanguageHistory = () => languageStorageService.getLanguageHistory();
export const updateLanguageStats = (locale: Locale, duration?: number) => languageStorageService.updateLanguageStats(locale, duration);
export const getLanguageStats = () => languageStorageService.getLanguageStats();
export const clearAll = () => languageStorageService.clearAll();

// 兼容性函数
export const getStoredLocale = () => languageStorageService.getLocale();
export const setStoredLocale = (locale: Locale) => languageStorageService.saveLocale(locale);
