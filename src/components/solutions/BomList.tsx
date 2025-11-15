'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BOM_CATEGORIES } from './BomForm';

// BOM 项类型定义（与 API 响应格式一致）
export interface BomListItem {
  id?: string;
  // 基础信息
  name: string;
  model?: string;
  quantity: number;
  unit?: string;
  notes?: string;
  // 价格和成本
  unitPrice?: number;
  // 供应商信息
  supplier?: string;
  // 零件标识
  partNumber?: string;
  manufacturer?: string;
  // 分类和位置
  category?: 'FRAME' | 'MOTOR' | 'ESC' | 'PROPELLER' | 'FLIGHT_CONTROLLER' | 'BATTERY' | 'CAMERA' | 'GIMBAL' | 'RECEIVER' | 'TRANSMITTER' | 'OTHER';
  position?: string;
  // 物理属性
  weight?: number;
  // 技术规格
  specifications?: Record<string, any>;
  // 关联商城商品
  productId?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images?: string[];
  };
  createdAt?: string;
}

interface BomListProps {
  items: BomListItem[];
  showAdvanced?: boolean; // 是否显示高级字段
  showStatistics?: boolean; // 是否显示统计信息
}

export function BomList({ items, showAdvanced = true, showStatistics = true }: BomListProps) {
  // 计算统计信息
  const totalCost = items.reduce((sum, item) => {
    return sum + ((item.unitPrice || 0) * item.quantity);
  }, 0);

  const totalWeight = items.reduce((sum, item) => {
    return sum + ((item.weight || 0) * item.quantity);
  }, 0);

  const categoryCounts = items.reduce((acc, item) => {
    if (item.category) {
      acc[item.category] = (acc[item.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-gray-500 text-center py-8">暂无 BOM 清单信息</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      {showStatistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">物料总数</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>
          {totalCost > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">总成本</div>
                <div className="text-2xl font-bold">¥{totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
          )}
          {totalWeight > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">总重量</div>
                <div className="text-2xl font-bold">{totalWeight.toFixed(1)}g</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 类别统计 */}
      {showAdvanced && Object.keys(categoryCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">物料分类统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <Badge key={category} variant="outline">
                  {BOM_CATEGORIES.find(c => c.value === category)?.label || category}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM 列表 */}
      <Card>
        <CardHeader>
          <CardTitle>BOM 清单 ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">物料名称</th>
                  {showAdvanced && <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">型号</th>}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                  {showAdvanced && <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">小计</th>
                  {showAdvanced && (
                    <>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">供应商</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">零件号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">类别</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">位置</th>
                      {totalWeight > 0 && <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">重量</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const subtotal = (item.unitPrice || 0) * item.quantity;
                  const itemWeight = (item.weight || 0) * item.quantity;

                  return (
                    <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.manufacturer && (
                          <div className="text-xs text-gray-500">{item.manufacturer}</div>
                        )}
                        {item.product && (
                          <div className="text-xs text-blue-600 mt-1">
                            <a href={`/shop/products/${item.product.id}`} className="hover:underline">
                              查看商品: {item.product.name}
                            </a>
                          </div>
                        )}
                      </td>
                      {showAdvanced && (
                        <td className="px-4 py-3 text-sm text-gray-600">{item.model || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.quantity} {item.unit || '个'}
                      </td>
                      {showAdvanced && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.unitPrice ? `¥${item.unitPrice.toFixed(2)}` : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.unitPrice ? `¥${subtotal.toFixed(2)}` : '-'}
                      </td>
                      {showAdvanced && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.supplier || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                            {item.partNumber || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {item.category && (
                              <Badge variant="outline">
                                {BOM_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.position || '-'}</td>
                          {totalWeight > 0 && (
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.weight ? `${itemWeight.toFixed(1)}g` : '-'}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {showAdvanced && totalCost > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={showAdvanced ? 4 : 2} className="px-4 py-3 text-right font-medium text-gray-900">
                      总计:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      ¥{totalCost.toFixed(2)}
                    </td>
                    {showAdvanced && (
                      <>
                        <td colSpan={showAdvanced ? 4 : 0}></td>
                        {totalWeight > 0 && (
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">
                            {totalWeight.toFixed(1)}g
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 技术规格详情（可展开） */}
          {showAdvanced && items.some(item => item.specifications && Object.keys(item.specifications).length > 0) && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-gray-700">技术规格详情</h4>
              {items
                .filter(item => item.specifications && Object.keys(item.specifications).length > 0)
                .map((item, index) => (
                  <div key={item.id || index} className="border border-gray-200 rounded-md p-4">
                    <div className="font-medium text-gray-900 mb-2">{item.name}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(item.specifications || {}).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>{' '}
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 备注信息 */}
          {items.some(item => item.notes) && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">备注信息</h4>
              {items
                .filter(item => item.notes)
                .map((item, index) => (
                  <div key={item.id || index} className="text-sm text-gray-600">
                    <span className="font-medium">{item.name}:</span> {item.notes}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

