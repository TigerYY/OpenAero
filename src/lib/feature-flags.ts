/**
 * 功能标志系统
 * 用于控制Supabase Auth的渐进式迁移
 */

// 功能标志类型
export interface FeatureFlags {
  useSupabaseAuth: boolean;        // 是否使用Supabase Auth
  enableOAuthProviders: boolean;   // 是否启用OAuth提供商
  enableEmailVerification: boolean; // 是否启用邮箱验证
  enablePasswordReset: boolean;    // 是否启用密码重置
  enableMigrationMode: boolean;    // 是否处于迁移模式
  debugAuth: boolean;             // 是否启用认证调试
}

// 默认配置
const DEFAULT_FLAGS: FeatureFlags = {
  useSupabaseAuth: false,          // 默认使用自建认证（安全起见）
  enableOAuthProviders: false,     // OAuth需要配置后启用
  enableEmailVerification: true,    // 邮箱验证通常需要
  enablePasswordReset: true,       // 密码重置是基础功能
  enableMigrationMode: false,       // 迁移模式默认关闭
  debugAuth: process.env.NODE_ENV === 'development', // 开发环境启用调试
};

// 从环境变量读取功能标志
function getFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    useSupabaseAuth: process.env.FEATURE_SUPABASE_AUTH === 'true',
    enableOAuthProviders: process.env.FEATURE_OAUTH_PROVIDERS === 'true',
    enableEmailVerification: process.env.FEATURE_EMAIL_VERIFICATION !== 'false',
    enablePasswordReset: process.env.FEATURE_PASSWORD_RESET !== 'false',
    enableMigrationMode: process.env.FEATURE_MIGRATION_MODE === 'true',
    debugAuth: process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development',
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
   * 获取当前认证系统类型
   */
  getAuthSystemType(): 'custom' | 'supabase' | 'hybrid' {
    if (this.flags.enableMigrationMode) {
      return 'hybrid';
    }
    return this.flags.useSupabaseAuth ? 'supabase' : 'custom';
  }

  /**
   * 检查是否可以使用OAuth
   */
  canUseOAuth(): boolean {
    return this.flags.useSupabaseAuth && this.flags.enableOAuthProviders;
  }

  /**
   * 检查是否需要邮箱验证
   */
  requiresEmailVerification(): boolean {
    return this.flags.useSupabaseAuth && this.flags.enableEmailVerification;
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): string {
    const authType = this.getAuthSystemType();
    const flags = Object.entries(this.flags)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `Auth System: ${authType} | Flags: ${flags}`;
  }
}

// 导出单例实例
export const featureFlags = FeatureFlagManager.getInstance();

// 便捷函数
export const useSupabaseAuth = () => featureFlags.isEnabled('useSupabaseAuth');
export const enableOAuthProviders = () => featureFlags.isEnabled('enableOAuthProviders');
export const enableEmailVerification = () => featureFlags.isEnabled('enableEmailVerification');
export const enablePasswordReset = () => featureFlags.isEnabled('enablePasswordReset');
export const enableMigrationMode = () => featureFlags.isEnabled('enableMigrationMode');
export const debugAuth = () => featureFlags.isEnabled('debugAuth');

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
    getAuthSystemType: () => featureFlags.getAuthSystemType(),
    canUseOAuth: () => featureFlags.canUseOAuth(),
    requiresEmailVerification: () => featureFlags.requiresEmailVerification(),
    getDebugInfo: () => featureFlags.getDebugInfo(),
  };
}

// 服务器端函数
export function getServerFeatureFlags(): FeatureFlags {
  return featureFlags.getFlags();
}

// 迁移助手
export class MigrationHelper {
  /**
   * 检查是否可以安全切换到Supabase Auth
   */
  static canSwitchToSupabase(): boolean {
    // 检查必要的环境变量
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn('Missing required Supabase environment variables:', missing);
      return false;
    }
    
    return true;
  }

  /**
   * 获取迁移建议
   */
  static getMigrationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!featureFlags.isEnabled('useSupabaseAuth')) {
      recommendations.push('可以启用Supabase Auth进行测试');
    }
    
    if (!featureFlags.isEnabled('enableOAuthProviders')) {
      recommendations.push('配置OAuth提供商后可启用OAuth登录');
    }
    
    if (!featureFlags.isEnabled('enableMigrationMode')) {
      recommendations.push('启用迁移模式可同时测试两种认证系统');
    }
    
    return recommendations;
  }

  /**
   * 执行安全的功能标志切换
   */
  static async safeSwitchToSupabase(): Promise<boolean> {
    if (!this.canSwitchToSupabase()) {
      console.error('Cannot switch to Supabase Auth: missing configuration');
      return false;
    }

    try {
      // 测试Supabase连接
      const { getSupabaseClient } = await import('./supabase');
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.from('users').select('count').single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase connection test failed:', error);
        return false;
      }

      // 切换功能标志
      featureFlags.setFlags({
        useSupabaseAuth: true,
        enableMigrationMode: true
      });

      console.log('✅ Successfully switched to Supabase Auth');
      return true;
    } catch (error) {
      console.error('Failed to switch to Supabase Auth:', error);
      return false;
    }
  }
}