/**
 * BOM 双写策略配置和工具函数
 * 在过渡期内，同时写入 SolutionBomItem 和 JSON 字段
 */

// 配置开关：是否启用双写策略
export const ENABLE_BOM_DUAL_WRITE = process.env.ENABLE_BOM_DUAL_WRITE !== 'false'; // 默认启用

/**
 * 将 SolutionBomItem 数组转换为 JSON 格式（用于写入 Solution.bom 字段）
 */
export function bomItemsToJson(items: Array<{
  name: string;
  model?: string | null;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  unitPrice?: number | null;
  supplier?: string | null;
  partNumber?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  position?: string | null;
  weight?: number | null;
  specifications?: any;
  productId?: string | null;
}>): any {
  // 使用新的格式：包含 components 数组和统计信息
  const components = items.map(item => ({
    name: item.name,
    model: item.model || undefined,
    quantity: item.quantity,
    unit: item.unit || '个',
    notes: item.notes || undefined,
    unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : undefined,
    supplier: item.supplier || undefined,
    partNumber: item.partNumber || undefined,
    manufacturer: item.manufacturer || undefined,
    category: item.category || undefined,
    position: item.position || undefined,
    weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : undefined,
    specifications: item.specifications || undefined,
    productId: item.productId || undefined,
  }));

  // 计算统计信息
  const totalCost = items.reduce((sum, item) => {
    const price = item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : 0;
    return sum + (price * item.quantity);
  }, 0);

  const totalWeight = items.reduce((sum, item) => {
    const weight = item.weight !== null && item.weight !== undefined ? Number(item.weight) : 0;
    return sum + (weight * item.quantity);
  }, 0);

  return {
    components,
    totalCost: totalCost > 0 ? totalCost : undefined,
    totalWeight: totalWeight > 0 ? totalWeight : undefined,
  };
}

/**
 * 检查是否应该执行双写
 */
export function shouldDualWrite(): boolean {
  return ENABLE_BOM_DUAL_WRITE;
}

