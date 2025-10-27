'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Package, Plus, Search, Calendar, Factory, FileText, Download, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SampleOrder {
  id: string;
  orderNumber: string;
  factoryId: string;
  solutionId: string;
  status: string;
  quantity: number;
  deadline?: string;
  notes?: string;
  requirements?: string;
  specFiles?: string[];
  resultFiles?: string[];
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  factory: {
    id: string;
    name: string;
    contactName: string;
  };
  solution: {
    id: string;
    title: string;
    creator: {
      name: string;
    };
  };
}

interface SampleOrderFormData {
  factoryId: string;
  solutionId: string;
  quantity: string;
  deadline: string;
  notes: string;
  requirements: string;
  specFiles: File[];
}

const STATUS_MAP = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: '生产中', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export default function SampleOrdersPage() {
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SampleOrder | null>(null);
  const [formData, setFormData] = useState<SampleOrderFormData>({
    factoryId: '',
    solutionId: '',
    quantity: '',
    deadline: '',
    notes: '',
    requirements: '',
    specFiles: [],
  });

  // 获取试产订单列表
  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (factoryFilter) params.append('factoryId', factoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/sample-orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      toast.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取工厂列表
  const fetchFactories = async () => {
    try {
      const response = await fetch('/api/factories?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        setFactories(data.factories);
      }
    } catch (error) {
      console.error('获取工厂列表失败:', error);
    }
  };

  // 获取解决方案列表
  const fetchSolutions = async () => {
    try {
      const response = await fetch('/api/solutions?status=PUBLISHED');
      if (response.ok) {
        const data = await response.json();
        setSolutions(data.solutions);
      }
    } catch (error) {
      console.error('获取解决方案列表失败:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchFactories();
    fetchSolutions();
  }, [statusFilter, factoryFilter]);

  // 创建试产订单
  const handleCreateOrder = async () => {
    if (!formData.factoryId || !formData.solutionId || !formData.quantity || !formData.deadline) {
      toast.error('请填写必填字段');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('factoryId', formData.factoryId);
      formDataToSend.append('solutionId', formData.solutionId);
      formDataToSend.append('quantity', formData.quantity);
      formDataToSend.append('deadline', formData.deadline);
      formDataToSend.append('notes', formData.notes);
      formDataToSend.append('requirements', formData.requirements);
      
      formData.specFiles.forEach((file, index) => {
        formDataToSend.append(`specFiles`, file);
      });

      const response = await fetch('/api/sample-orders', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success('试产订单创建成功');
        setIsAddDialogOpen(false);
        resetForm();
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.message || '创建失败');
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      toast.error('创建订单失败');
    }
  };

  // 更新订单状态
  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/sample-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('状态更新成功');
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.message || '更新失败');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      toast.error('更新状态失败');
    }
  };

  // 导出订单文件
  const handleExportOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/sample-orders/${orderId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `sample-order-${orderId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('文件导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 打开编辑对话框
  const openEditDialog = (order: SampleOrder) => {
    setSelectedOrder(order);
    setFormData({
      factoryId: order.factoryId || '',
      solutionId: order.solutionId || '',
      quantity: order.quantity.toString(),
      deadline: order.deadline ? order.deadline.split('T')[0] : '',
      notes: order.notes || '',
      requirements: order.requirements || '',
      specFiles: [],
    });
    setIsEditDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      factoryId: '',
      solutionId: '',
      quantity: '',
      deadline: '',
      notes: '',
      requirements: '',
      specFiles: [],
    });
    setSelectedOrder(null);
  };

  // 过滤订单
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.factory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.solution.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">试产订单管理</h1>
          <p className="text-muted-foreground mt-2">管理和跟踪所有试产订单</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建订单
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索订单号、工厂或解决方案..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-32 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待确认</option>
          <option value="CONFIRMED">已确认</option>
          <option value="IN_PROGRESS">生产中</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        
        <select 
          value={factoryFilter} 
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="w-40 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
        >
          <option value="">全部工厂</option>
          {factories.map(factory => (
            <option key={factory.id} value={factory.id}>{factory.name}</option>
          ))}
        </select>
      </div>

      {/* 订单列表 */}
      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                    <Badge className={STATUS_MAP[order.status as keyof typeof STATUS_MAP]?.color}>
                      {STATUS_MAP[order.status as keyof typeof STATUS_MAP]?.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4" />
                      <span>工厂: {order.factory.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>解决方案: {order.solution.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>截止日期: {order.deadline ? formatDate(order.deadline) : '未设置'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold mb-1">
                    数量: {order.quantity} 件
                  </div>
                  {order.estimatedCost && (
                    <div className="text-sm text-muted-foreground">
                      预估成本: {formatCurrency(order.estimatedCost)}
                    </div>
                  )}
                  {order.actualCost && (
                    <div className="text-sm font-medium">
                      实际成本: {formatCurrency(order.actualCost)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  创建时间: {formatDate(order.createdAt)}
                </div>
                
                <div className="flex gap-2">
                  {order.status === 'PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                    >
                      确认订单
                    </Button>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(order.id, 'IN_PROGRESS')}
                    >
                      开始生产
                    </Button>
                  )}
                  {order.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                    >
                      完成订单
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(order)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportOrder(order.id)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    导出
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无试产订单</h3>
          <p className="text-muted-foreground mb-4">开始创建第一个试产订单</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建订单
          </Button>
        </div>
      )}

      {/* 创建订单对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建试产订单</DialogTitle>
            <DialogDescription>
              填写订单信息并上传相关文件
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>选择工厂 *</Label>
                <select 
                  value={formData.factoryId} 
                  onChange={(e) => setFormData({...formData, factoryId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="">请选择工厂</option>
                  {factories.map(factory => (
                    <option key={factory.id} value={factory.id}>{factory.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>选择解决方案 *</Label>
                <select 
                  value={formData.solutionId} 
                  onChange={(e) => setFormData({...formData, solutionId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="">请选择解决方案</option>
                  {solutions.map(solution => (
                    <option key={solution.id} value={solution.id}>{solution.title}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">试产数量 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="请输入试产数量"
                />
              </div>
              <div>
                <Label htmlFor="deadline">截止日期 *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="requirements">试产要求</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                placeholder="请输入具体的试产要求和标准"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">备注信息</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="请输入备注信息"
                rows={2}
              />
            </div>
            
            <div>
              <Label>规格文件</Label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFormData({...formData, specFiles: files});
                }}
                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={handleCreateOrder}>
              创建订单
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑订单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑试产订单</DialogTitle>
            <DialogDescription>
              修改订单信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>工厂</Label>
                <Input value={selectedOrder?.factory.name || ''} disabled />
              </div>
              <div>
                <Label>解决方案</Label>
                <Input value={selectedOrder?.solution.title || ''} disabled />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-quantity">试产数量 *</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-deadline">截止日期 *</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-requirements">试产要求</Label>
              <Textarea
                id="edit-requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-notes">备注信息</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              取消
            </Button>
            <Button onClick={async () => {
              if (selectedOrder) {
                try {
                  const response = await fetch(`/api/sample-orders/${selectedOrder.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      quantity: parseInt(formData.quantity),
                      deadline: formData.deadline,
                      requirements: formData.requirements,
                      notes: formData.notes,
                    }),
                  });

                  if (response.ok) {
                    toast.success('订单更新成功');
                    setIsEditDialogOpen(false);
                    resetForm();
                    fetchOrders();
                  } else {
                    const error = await response.json();
                    toast.error(error.message || '更新失败');
                  }
                } catch (error) {
                  console.error('更新订单失败:', error);
                  toast.error('更新订单失败');
                }
              }
            }}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}