/**
 * 表单验证工具
 * 统一的表单验证规则和错误消息
 */

import { z } from 'zod';

/**
 * 常用验证规则
 */
export const ValidationRules = {
  email: z.string().email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少需要8个字符')
    .regex(/[A-Z]/, '密码必须包含至少一个大写字母')
    .regex(/[a-z]/, '密码必须包含至少一个小写字母')
    .regex(/[0-9]/, '密码必须包含至少一个数字'),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  url: z.string().url('请输入有效的URL地址'),
  required: (message?: string) => z.string().min(1, message || '此字段为必填项'),
  minLength: (min: number, message?: string) =>
    z.string().min(min, message || `至少需要${min}个字符`),
  maxLength: (max: number, message?: string) =>
    z.string().max(max, message || `最多${max}个字符`),
  number: z.coerce.number(),
  positiveNumber: z.coerce.number().positive('必须为正数'),
  nonNegativeNumber: z.coerce.number().nonnegative('不能为负数'),
  integer: z.coerce.number().int('必须为整数'),
  date: z.string().or(z.date()),
  futureDate: z.date().refine((date) => date > new Date(), {
    message: '日期必须是将来的日期',
  }),
  pastDate: z.date().refine((date) => date < new Date(), {
    message: '日期必须是过去的日期',
  }),
};

/**
 * 创建表单验证 Schema
 */
export function createFormSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

/**
 * 验证表单数据
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * 获取字段错误消息
 */
export function getFieldError(errors: z.ZodError, fieldName: string): string | undefined {
  const fieldError = errors.errors.find((err) => err.path.includes(fieldName));
  return fieldError?.message;
}

/**
 * 获取所有字段错误
 */
export function getAllFieldErrors(errors: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  errors.errors.forEach((error) => {
    const fieldName = error.path.join('.');
    if (fieldName) {
      fieldErrors[fieldName] = error.message;
    }
  });
  return fieldErrors;
}

/**
 * 常用表单 Schema
 */
export const CommonSchemas = {
  email: ValidationRules.email,
  password: ValidationRules.password,
  confirmPassword: (passwordField: string = 'password') =>
    z.string().refine((val, ctx) => {
      const formData = ctx.parent;
      return val === formData[passwordField];
    }, '两次输入的密码不一致'),
  phone: ValidationRules.phone,
  url: ValidationRules.url,
  requiredString: ValidationRules.required(),
  optionalString: z.string().optional(),
  positiveInteger: ValidationRules.integer.pipe(ValidationRules.positiveNumber),
};

