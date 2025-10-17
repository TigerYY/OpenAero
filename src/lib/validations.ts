import { z } from 'zod';

// 用户相关验证
export const userSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  name: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符'),
  password: z.string().min(8, '密码至少需要8个字符'),
});

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

// 创作者申请验证
export const creatorApplicationSchema = z.object({
  bio: z.string().min(50, '个人简介至少需要50个字符').max(500, '个人简介不能超过500个字符'),
  website: z.string().url('请输入有效的网站地址').optional().or(z.literal('')),
  experience: z.string().min(20, '经验描述至少需要20个字符').max(1000, '经验描述不能超过1000个字符'),
  specialties: z.array(z.string()).min(1, '请至少选择一个专业领域').max(5, '最多选择5个专业领域'),
});

// 创作者申请验证 (别名)
export const creatorApplySchema = creatorApplicationSchema;

// 解决方案验证
export const solutionSchema = z.object({
  title: z.string().min(5, '标题至少需要5个字符').max(100, '标题不能超过100个字符'),
  description: z.string().min(50, '描述至少需要50个字符').max(2000, '描述不能超过2000个字符'),
  category: z.string().min(1, '请选择分类'),
  price: z.number().min(0, '价格不能为负数').max(100000, '价格不能超过100000'),
  features: z.array(z.string()).min(1, '请至少添加一个功能特性').max(10, '最多添加10个功能特性'),
  specs: z.record(z.any()).optional(),
  bom: z.record(z.any()).optional(),
});

// 评价验证
export const reviewSchema = z.object({
  rating: z.number().min(1, '评分至少为1星').max(5, '评分最多为5星'),
  comment: z.string().min(10, '评价至少需要10个字符').max(500, '评价不能超过500个字符').optional(),
});

// 搜索验证
export const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sortBy: z.enum(['price', 'rating', 'createdAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// 分页验证
export const paginationSchema = z.object({
  page: z.number().min(1, '页码必须大于0').default(1),
  limit: z.number().min(1, '每页数量必须大于0').max(100, '每页数量不能超过100').default(20),
});

// 文件上传验证
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: '请选择文件' }),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

// 联系表单验证
export const contactSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  subject: z.string().min(5, '主题至少需要5个字符'),
  message: z.string().min(20, '消息至少需要20个字符'),
});

// 订单验证
export const orderSchema = z.object({
  solutions: z.array(z.object({
    solutionId: z.string(),
    quantity: z.number().min(1, '数量必须大于0'),
  })).min(1, '请至少选择一个解决方案'),
  shippingAddress: z.object({
    name: z.string().min(2, '收货人姓名至少需要2个字符'),
    phone: z.string().min(10, '请输入有效的手机号码'),
    address: z.string().min(10, '请输入详细的收货地址'),
    city: z.string().min(2, '请输入城市'),
    province: z.string().min(2, '请输入省份'),
    postalCode: z.string().min(6, '请输入有效的邮政编码'),
  }),
});
