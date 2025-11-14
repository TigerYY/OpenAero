/**
 * 字段名映射工具
 * 用于将数据库的 snake_case 字段名转换为 API 响应的 camelCase
 */

/**
 * 将 snake_case 字符串转换为 camelCase
 * @example snakeToCamel('user_id') => 'userId'
 * @example snakeToCamel('created_at') => 'createdAt'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将 camelCase 字符串转换为 snake_case
 * @example camelToSnake('userId') => 'user_id'
 * @example camelToSnake('createdAt') => 'created_at'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 递归转换对象的字段名从 snake_case 到 camelCase
 * @param obj - 要转换的对象
 * @param excludeKeys - 排除的键（不转换）
 */
export function convertSnakeToCamel<T = any>(
  obj: any,
  excludeKeys: string[] = []
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => convertSnakeToCamel(item, excludeKeys)) as T;
  }

  // 处理日期对象
  if (obj instanceof Date) {
    return obj as T;
  }

  // 处理基本类型
  if (typeof obj !== 'object') {
    return obj as T;
  }

  // 处理对象
  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // 如果键在排除列表中，保持原样
    if (excludeKeys.includes(key)) {
      converted[key] = value;
      continue;
    }

    // 转换键名
    const camelKey = snakeToCamel(key);

    // 递归转换值
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      if (Array.isArray(value)) {
        converted[camelKey] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? convertSnakeToCamel(item, excludeKeys)
            : item
        );
      } else {
        converted[camelKey] = convertSnakeToCamel(value, excludeKeys);
      }
    } else {
      converted[camelKey] = value;
    }
  }

  return converted as T;
}

/**
 * 转换 UserProfile 相关字段（使用 snake_case 的模型）
 * 这些字段在 Prisma schema 中使用 @map，Prisma Client 返回的是 camelCase
 * 但为了确保一致性，我们显式转换
 */
export function convertUserProfileFields<T = any>(obj: any): T {
  // UserProfile 字段映射
  const fieldMap: Record<string, string> = {
    user_id: 'userId',
    first_name: 'firstName',
    last_name: 'lastName',
    display_name: 'displayName',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    last_login_at: 'lastLoginAt',
    is_blocked: 'isBlocked',
    blocked_reason: 'blockedReason',
    blocked_at: 'blockedAt',
  };

  return convertSnakeToCamel(obj, Object.keys(fieldMap));
}

/**
 * 转换 CreatorProfile 相关字段
 */
export function convertCreatorProfileFields<T = any>(obj: any): T {
  const fieldMap: Record<string, string> = {
    user_id: 'userId',
    company_name: 'companyName',
    business_license: 'businessLicense',
    id_card: 'idCard',
    tax_number: 'taxNumber',
    verification_status: 'verificationStatus',
    verified_at: 'verifiedAt',
    rejection_reason: 'rejectionReason',
    total_solutions: 'totalSolutions',
    total_revenue: 'totalRevenue',
    bank_name: 'bankName',
    bank_account: 'bankAccount',
    bank_account_name: 'bankAccountName',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  };

  return convertSnakeToCamel(obj, Object.keys(fieldMap));
}

/**
 * 转换 SolutionReview 相关字段
 */
export function convertSolutionReviewFields<T = any>(obj: any): T {
  const fieldMap: Record<string, string> = {
    solution_id: 'solutionId',
    reviewer_id: 'reviewerId',
    quality_score: 'qualityScore',
    market_potential: 'marketPotential',
    decision_notes: 'decisionNotes',
    reviewed_at: 'reviewedAt',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  };

  return convertSnakeToCamel(obj, Object.keys(fieldMap));
}

/**
 * 转换通用时间戳字段（created_at, updated_at 等）
 * 适用于大多数模型
 */
export function convertTimestampFields<T = any>(obj: any): T {
  return convertSnakeToCamel(obj, ['created_at', 'updated_at', 'deleted_at']);
}

