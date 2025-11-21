'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// BOM 物料类别枚举
export const BOM_CATEGORIES = [
  { value: 'FRAME', label: '机架' },
  { value: 'MOTOR', label: '电机' },
  { value: 'ESC', label: '电调' },
  { value: 'PROPELLER', label: '螺旋桨' },
  { value: 'FLIGHT_CONTROLLER', label: '飞控' },
  { value: 'BATTERY', label: '电池' },
  { value: 'CAMERA', label: '相机' },
  { value: 'GIMBAL', label: '云台' },
  { value: 'RECEIVER', label: '接收机' },
  { value: 'TRANSMITTER', label: '发射机' },
  { value: 'OTHER', label: '其他' },
] as const;

// 数量单位选项
export const BOM_UNITS = [
  { value: '个', label: '个' },
  { value: '套', label: '套' },
  { value: '米', label: '米' },
  { value: '克', label: '克' },
  { value: '千克', label: '千克' },
  { value: '片', label: '片' },
  { value: '块', label: '块' },
  { value: '条', label: '条' },
] as const;

// BOM 项类型定义（方案 B - 完整增强）
export interface BomItem {
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
}

interface BomFormProps {
  items: BomItem[];
  onChange: (items: BomItem[]) => void;
  readonly?: boolean;
  showAdvanced?: boolean; // 是否显示高级字段
}

export function BomForm({ items, onChange, readonly = false, showAdvanced = true }: BomFormProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BomItem>>({
    name: '',
    quantity: 1,
    unit: '个',
    unitPrice: 0,
  });
  // 使用字符串状态来存储数量输入值，允许用户自由输入
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  // 计算总成本和总重量
  const totalCost = items.reduce((sum, item) => {
    return sum + ((item.unitPrice || 0) * item.quantity);
  }, 0);

  const totalWeight = items.reduce((sum, item) => {
    return sum + ((item.weight || 0) * item.quantity);
  }, 0);

  const handleAddItem = useCallback(() => {
    if (!newItem.name || !newItem.name.trim()) {
      return;
    }

    // 验证数量，确保至少为1
    const quantity = (newItem.quantity && newItem.quantity > 0) ? newItem.quantity : 1;

    const item: BomItem = {
      name: newItem.name.trim(),
      model: newItem.model?.trim(),
      quantity: quantity,
      unit: newItem.unit || '个',
      notes: newItem.notes?.trim(),
      unitPrice: newItem.unitPrice,
      supplier: newItem.supplier?.trim(),
      partNumber: newItem.partNumber?.trim(),
      manufacturer: newItem.manufacturer?.trim(),
      category: newItem.category,
      position: newItem.position?.trim(),
      weight: newItem.weight,
      specifications: newItem.specifications || {},
      productId: newItem.productId,
    };

    onChange([...items, item]);
    setNewItem({
      name: '',
      quantity: 1,
      unit: '个',
      unitPrice: 0,
    });
    setQuantityInput('1');
    setShowAddForm(false);
  }, [newItem, items, onChange]);

  const handleUpdateItem = useCallback((index: number, field: keyof BomItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  }, [items, onChange]);

  const handleDeleteItem = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const handleAddSpec = useCallback(() => {
    if (!specKey.trim() || !specValue.trim()) {
      return;
    }

    const currentSpecs = newItem.specifications || {};
    setNewItem({
      ...newItem,
      specifications: {
        ...currentSpecs,
        [specKey.trim()]: specValue.trim(),
      },
    });
    setSpecKey('');
    setSpecValue('');
  }, [newItem, specKey, specValue]);

  const handleRemoveSpec = useCallback((key: string) => {
    const currentSpecs = { ...newItem.specifications };
    delete currentSpecs[key];
    setNewItem({
      ...newItem,
      specifications: currentSpecs,
    });
  }, [newItem]);

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">物料总数</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">总成本</div>
              <div className="text-2xl font-bold">¥{totalCost.toFixed(2)}</div>
            </CardContent>
          </Card>
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

      {/* BOM 列表 */}
      {items.length > 0 && (
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">型号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">数量</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">单价</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">小计</th>
                    {showAdvanced && (
                      <>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">供应商</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">零件号</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">类别</th>
                      </>
                    )}
                    {!readonly && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.manufacturer && (
                          <div className="text-xs text-gray-500">{item.manufacturer}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.model || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.quantity} {item.unit || '个'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.unitPrice ? `¥${item.unitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.unitPrice ? `¥${((item.unitPrice || 0) * item.quantity).toFixed(2)}` : '-'}
                      </td>
                      {showAdvanced && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.supplier || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.partNumber || '-'}</td>
                          <td className="px-4 py-3">
                            {item.category && (
                              <Badge variant="outline">
                                {BOM_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                              </Badge>
                            )}
                          </td>
                        </>
                      )}
                      {!readonly && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingIndex(index);
                                setNewItem(item);
                                setQuantityInput(item.quantity?.toString() || '1');
                                setShowAddForm(true);
                                handleDeleteItem(index);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加表单 */}
      {!readonly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{showAddForm ? '编辑 BOM 项' : '添加 BOM 项'}</span>
              {showAddForm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingIndex(null);
                    setNewItem({
                      name: '',
                      quantity: 1,
                      unit: '个',
                      unitPrice: 0,
                    });
                    setQuantityInput('1');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showAddForm ? (
              <Button
                type="button"
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加 BOM 项
              </Button>
            ) : (
              <div className="space-y-4">
                {/* 基础信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bom-name">物料名称 *</Label>
                    <Input
                      id="bom-name"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="例如：DJI F450 机架"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bom-model">型号</Label>
                    <Input
                      id="bom-model"
                      value={newItem.model || ''}
                      onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                      placeholder="例如：F450"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bom-quantity">数量 *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bom-quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={quantityInput}
                        onChange={(e) => {
                          // 允许用户输入任何内容（包括空字符串）
                          const value = e.target.value;
                          setQuantityInput(value);
                          // 同时更新 newItem，如果值是有效数字
                          if (value !== '') {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue > 0) {
                              setNewItem({ ...newItem, quantity: Math.floor(numValue) });
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // 失去焦点时，验证并修正值
                          const value = e.target.value.trim();
                          const numValue = Number(value);
                          if (!value || isNaN(numValue) || numValue <= 0) {
                            // 如果值为空或无效，设置为默认值1
                            setQuantityInput('1');
                            setNewItem({ ...newItem, quantity: 1 });
                          } else {
                            // 确保是正整数
                            const validQuantity = Math.max(1, Math.floor(numValue));
                            setQuantityInput(validQuantity.toString());
                            setNewItem({ ...newItem, quantity: validQuantity });
                          }
                        }}
                        className="flex-1"
                        required
                        placeholder="请输入数量"
                      />
                      <Select
                        value={newItem.unit || '个'}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        className="flex-1"
                      >
                        {BOM_UNITS.map(unit => (
                          <option key={unit.value} value={unit.value}>{unit.label}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bom-unitPrice">单价 (¥)</Label>
                    <Input
                      id="bom-unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unitPrice || ''}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* 高级字段 */}
                {showAdvanced && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bom-supplier">供应商</Label>
                        <Input
                          id="bom-supplier"
                          value={newItem.supplier || ''}
                          onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                          placeholder="例如：DJI官方"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bom-partNumber">零件号/SKU</Label>
                        <Input
                          id="bom-partNumber"
                          value={newItem.partNumber || ''}
                          onChange={(e) => setNewItem({ ...newItem, partNumber: e.target.value })}
                          placeholder="例如：DJI-F450-001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bom-manufacturer">制造商</Label>
                        <Input
                          id="bom-manufacturer"
                          value={newItem.manufacturer || ''}
                          onChange={(e) => setNewItem({ ...newItem, manufacturer: e.target.value })}
                          placeholder="例如：DJI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bom-category">物料类别</Label>
                        <Select
                          id="bom-category"
                          value={newItem.category || ''}
                          onChange={(e) => setNewItem({ ...newItem, category: e.target.value as BomItem['category'] })}
                        >
                          <option value="">请选择</option>
                          {BOM_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bom-position">安装位置</Label>
                        <Input
                          id="bom-position"
                          value={newItem.position || ''}
                          onChange={(e) => setNewItem({ ...newItem, position: e.target.value })}
                          placeholder="例如：主体、四轴、机头"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bom-weight">重量 (g)</Label>
                        <Input
                          id="bom-weight"
                          type="number"
                          min="0"
                          step="0.1"
                          value={newItem.weight || ''}
                          onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })}
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    {/* 技术规格 */}
                    <div>
                      <Label>技术规格</Label>
                      <div className="space-y-2">
                        {newItem.specifications && Object.entries(newItem.specifications).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Badge variant="outline" className="flex-1">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSpec(key)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="规格名称"
                            value={specKey}
                            onChange={(e) => setSpecKey(e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="规格值"
                            value={specValue}
                            onChange={(e) => setSpecValue(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddSpec}
                            disabled={!specKey.trim() || !specValue.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 备注 */}
                    <div>
                      <Label htmlFor="bom-notes">备注</Label>
                      <Textarea
                        id="bom-notes"
                        value={newItem.notes || ''}
                        onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                        placeholder="其他说明信息"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newItem.name?.trim()}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingIndex !== null ? '更新' : '添加'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingIndex(null);
                      setNewItem({
                        name: '',
                        quantity: 1,
                        unit: '个',
                        unitPrice: 0,
                      });
                      setQuantityInput('1');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

