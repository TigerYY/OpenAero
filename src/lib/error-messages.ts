/**
 * 统一错误消息处理
 * 提供错误消息的国际化映射和格式化
 */

import { AuthError } from '@supabase/supabase-js';

/**
 * 错误消息映射（中文）
 */
const errorMessagesZh: Record<string, string> = {
  // 认证相关错误
  'Invalid login credentials': '邮箱或密码错误',
  'Invalid credentials': '邮箱或密码错误',
  'Email not confirmed': '请先验证您的邮箱地址',
  'email_not_confirmed': '请先验证您的邮箱地址',
  'already registered': '该邮箱已被注册',
  'already exists': '该邮箱已被注册',
  'User already registered': '该邮箱已被注册',
  'suspended': '您的账户已被暂停，请联系管理员',
  'SUSPENDED': '您的账户已被暂停，请联系管理员',
  'deleted': '您的账户已被删除',
  'DELETED': '您的账户已被删除',
  'not found': '用户不存在',
  'does not exist': '用户不存在',
  'already confirmed': '该邮箱已验证，无需重新发送',
  'already verified': '该邮箱已验证，无需重新发送',
  
  // 验证相关错误
  'Validation failed': '验证失败',
  'Invalid email': '无效的邮箱地址',
  'Password too short': '密码长度不足',
  'Password too weak': '密码强度不足',
  
  // 网络相关错误
  'Network error': '网络错误，请检查您的网络连接',
  'Request timeout': '请求超时，请稍后重试',
  'Service unavailable': '服务暂时不可用，请稍后重试',
  
  // 数据库相关错误
  'Database error': '数据库错误',
  'Database error saving new user': '注册失败，数据库错误',
  
  // 通用错误
  'An unexpected error occurred': '发生意外错误，请稍后重试',
  'Internal server error': '服务器内部错误，请稍后重试',
};

/**
 * 错误消息映射（英文）
 */
const errorMessagesEn: Record<string, string> = {
  // 认证相关错误
  'Invalid login credentials': 'Invalid email or password',
  'Invalid credentials': 'Invalid email or password',
  'Email not confirmed': 'Please verify your email address first',
  'email_not_confirmed': 'Please verify your email address first',
  'already registered': 'This email is already registered',
  'already exists': 'This email is already registered',
  'User already registered': 'This email is already registered',
  'suspended': 'Your account has been suspended, please contact administrator',
  'SUSPENDED': 'Your account has been suspended, please contact administrator',
  'deleted': 'Your account has been deleted',
  'DELETED': 'Your account has been deleted',
  'not found': 'User not found',
  'does not exist': 'User does not exist',
  'already confirmed': 'This email is already verified',
  'already verified': 'This email is already verified',
  
  // 验证相关错误
  'Validation failed': 'Validation failed',
  'Invalid email': 'Invalid email address',
  'Password too short': 'Password is too short',
  'Password too weak': 'Password is too weak',
  
  // 网络相关错误
  'Network error': 'Network error, please check your connection',
  'Request timeout': 'Request timeout, please try again later',
  'Service unavailable': 'Service temporarily unavailable, please try again later',
  
  // 通用错误
  'An unexpected error occurred': 'An unexpected error occurred, please try again later',
  'Internal server error': 'Internal server error, please try again later',
};

/**
 * 获取本地化的错误消息
 * @param error 错误对象或错误消息
 * @param locale 语言代码，默认为 'zh-CN'
 * @returns 本地化的错误消息
 */
export function getLocalizedErrorMessage(
  error: unknown,
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
): string {
  const messages = locale === 'zh-CN' ? errorMessagesZh : errorMessagesEn;
  
  // 处理 Error 对象
  if (error instanceof Error) {
    const message = error.message;
    
    // 查找匹配的错误消息
    for (const [key, value] of Object.entries(messages)) {
      if (message.includes(key)) {
        return value;
      }
    }
    
    // 如果没有匹配，返回原始消息
    return message;
  }
  
  // 处理字符串
  if (typeof error === 'string') {
    for (const [key, value] of Object.entries(messages)) {
      if (error.includes(key)) {
        return value;
      }
    }
    return error;
  }
  
  // 处理 Supabase AuthError
  if (error && typeof error === 'object' && 'message' in error) {
    const authError = error as AuthError;
    const message = authError.message;
    
    for (const [key, value] of Object.entries(messages)) {
      if (message.includes(key)) {
        return value;
      }
    }
    
    return message;
  }
  
  // 默认错误消息
  return locale === 'zh-CN' 
    ? '发生意外错误，请稍后重试'
    : 'An unexpected error occurred, please try again later';
}

/**
 * 格式化验证错误消息
 * @param fieldErrors 字段错误对象
 * @param locale 语言代码
 * @returns 格式化的错误消息数组
 */
export function formatValidationErrors(
  fieldErrors: Record<string, string[]>,
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
): string[] {
  const errors: string[] = [];
  
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      const fieldName = locale === 'zh-CN' 
        ? getFieldNameZh(field)
        : getFieldNameEn(field);
      
      messages.forEach(msg => {
        errors.push(`${fieldName}: ${msg}`);
      });
    }
  }
  
  return errors;
}

/**
 * 获取字段名称（中文）
 */
function getFieldNameZh(field: string): string {
  const fieldNames: Record<string, string> = {
    email: '邮箱地址',
    password: '密码',
    confirmPassword: '确认密码',
    firstName: '名字',
    lastName: '姓氏',
    displayName: '显示名称',
    phone: '手机号码',
  };
  
  return fieldNames[field] || field;
}

/**
 * 获取字段名称（英文）
 */
function getFieldNameEn(field: string): string {
  const fieldNames: Record<string, string> = {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    displayName: 'Display Name',
    phone: 'Phone',
  };
  
  return fieldNames[field] || field;
}

