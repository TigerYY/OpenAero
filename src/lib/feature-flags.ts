/**
 * 功能标志系统
 * 用于控制项目功能的开关状态
 */

// 功能标志类型 - 移除用户认证相关功能
export interface FeatureFlags {
  enableAnalytics: boolean;       // 是否启用分析统计
  enableMonitoring: boolean;      // 是否启用监控
  enableDarkMode: boolean;        // 是否启用深色模式
  enableDebugMode: boolean;       // 是否启用调试模式
  enableFeatureX: boolean;        // 预留功能标志X
  enableFeatureY: boolean;        // 预留功能标志Y
}

// 默认配置
const DEFAULT_FLAGS: FeatureFlags = {
  enableAnalytics: true,          // 默认启用分析
  enableMonitoring: true,         // 默认启用监控
  enableDarkMode: false,          // 深色模式默认关闭
  enableDebugMode: process.env.NODE_ENV === 'development', // 开发环境启用调试
  enableFeatureX: false,          // 新功能默认关闭
  enableFeatureY: false,          // 新功能默认关闭
};

// 从环境变量读取功能标志
function getFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableMonitoring: process.env.NEXT_PUBLIC_ENABLE_MONITORING === 'true',
    enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === 'true',
    enableDebugMode: process.env.NEXT_PUBLIC_DEBUG_ENV === 'true' || process.env.NODE_ENV === 'development',
    enableFeatureX: process.env.ENABLE_FEATURE_X === 'true',
    enableFeatureY: process.env.ENABLE_FEATURE_Y === 'true',
  };
}

// 功能标志管理器
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: FeatureFlags;
  private listeners: Set<(flags: FeatureFlags) => void> = new Set();

  private constructor() {
    this.flags = { ...DEFAULT_FLAGS, ...getFlagsFromEnv() };
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * 获取所有功能标志
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * 获取特定功能标志
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * 设置功能标志（主要用于测试和调试）
   */
  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    this.notifyListeners();
  }

  /**
   * 批量设置功能标志
   */
  setFlags(newFlags: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...newFlags };
    this.notifyListeners();
  }

  /**
   * 监听功能标志变化
   */
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.flags));
  }

  /**
   * 重置为默认值
   */
  reset(): void {
    this.flags = { ...DEFAULT_FLAGS, ...getFlagsFromEnv() };
    this.notifyListeners();
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): string {
    const flags = Object.entries(this.flags)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `Feature Flags: ${flags}`;
  }
}

// 导出单例实例
export const featureFlags = FeatureFlagManager.getInstance();

// 便捷函数
export const analyticsEnabled = () => featureFlags.isEnabled('enableAnalytics');
export const monitoringEnabled = () => featureFlags.isEnabled('enableMonitoring');
export const darkModeEnabled = () => featureFlags.isEnabled('enableDarkMode');
export const debugModeEnabled = () => featureFlags.isEnabled('enableDebugMode');

// React Hook
export function useFeatureFlags() {
  const [flags, setFlags] = React.useState<FeatureFlags>(featureFlags.getFlags());

  React.useEffect(() => {
    const unsubscribe = featureFlags.subscribe(setFlags);
    return unsubscribe;
  }, []);

  return {
    flags,
    isEnabled: (flag: keyof FeatureFlags) => flags[flag],
    setFlag: (flag: keyof FeatureFlags, value: boolean) => featureFlags.setFlag(flag, value),
    getDebugInfo: () => featureFlags.getDebugInfo(),
  };
}

// 服务器端函数
export function getServerFeatureFlags(): FeatureFlags {
  return featureFlags.getFlags();
}