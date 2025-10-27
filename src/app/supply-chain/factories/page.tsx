'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Trash2, Edit, Plus, Search, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Factory {
  id: string;
  name: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  address: string;
  categories: string[];
  description?: string;
  status: string;
  capacity?: number;
  leadTime?: number;
  minOrder?: number;
  createdAt: string;
  _count: {
    sampleOrders: number;
  };
}

interface FactoryFormData {
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  categories: string[];
  description: string;
  capacity: string;
  leadTime: string;
  minOrder: string;
}

const CATEGORIES = [
  '电子产品',
  '机械零件',
  '塑料制品',
  '金属加工',
  '纺织品',
  '包装材料',
  '其他'
];

export default function FactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [formData, setFormData] = useState<FactoryFormData>({
    name: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    categories: [],
    description: '',
    capacity: '',
    leadTime: '',
    minOrder: ''
  });

  // 获取工厂列表
  const fetchFactories = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/factories?${params}`);
      const data = await response.json();

      if (data.success) {
        setFactories(data.data.factories);
      } else {
        toast.error('获取工厂列表失败');
      }
    } catch (error) {
      console.error('获取工厂列表失败:', error);
      toast.error('获取工厂列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, [searchTerm, statusFilter, categoryFilter]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      address: '',
      categories: [],
      description: '',
      capacity: '',
      leadTime: '',
      minOrder: ''
    });
  };

  // 处理添加工厂
  const handleAddFactory = async () => {
    try {
      const response = await fetch('/api/factories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('工厂添加成功');
        setIsAddDialogOpen(false);
        resetForm();
        fetchFactories();
      } else {
        toast.error(data.error || '添加工厂失败');
      }
    } catch (error) {
      console.error('添加工厂失败:', error);
      toast.error('添加工厂失败');
    }
  };

  // 处理编辑工厂
  const handleEditFactory = async () => {
    if (!editingFactory) return;

    try {
      const response = await fetch(`/api/factories/${editingFactory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('工厂更新成功');
        setIsEditDialogOpen(false);
        setEditingFactory(null);
        resetForm();
        fetchFactories();
      } else {
        toast.error(data.error || '更新工厂失败');
      }
    } catch (error) {
      console.error('更新工厂失败:', error);
      toast.error('更新工厂失败');
    }
  };

  // 处理删除工厂
  const handleDeleteFactory = async (factory: Factory) => {
    if (!confirm(`确定要删除工厂 "${factory.name}" 吗？`)) return;

    try {
      const response = await fetch(`/api/factories/${factory.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('工厂删除成功');
        fetchFactories();
      } else {
        toast.error(data.error || '删除工厂失败');
      }
    } catch (error) {
      console.error('删除工厂失败:', error);
      toast.error('删除工厂失败');
    }
  };

  // 打开编辑对话框
  const openEditDialog = (factory: Factory) => {
    setEditingFactory(factory);
    setFormData({
      name: factory.name,
      contactName: factory.contactName,
      contactPhone: factory.contactPhone || '',
      contactEmail: factory.contactEmail || '',
      address: factory.address,
      categories: factory.categories,
      description: factory.description || '',
      capacity: factory.capacity?.toString() || '',
      leadTime: factory.leadTime?.toString() || '',
      minOrder: factory.minOrder?.toString() || ''
    });
    setIsEditDialogOpen(true);
  };

  // 处理分类选择
  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ACTIVE: { label: '活跃', variant: 'default' as const },
      INACTIVE: { label: '停用', variant: 'secondary' as const },
      SUSPENDED: { label: '暂停', variant: 'destructive' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">工厂管理</h1>
          <p className="text-muted-foreground mt-2">管理供应链合作工厂信息</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              添加工厂
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加新工厂</DialogTitle>
              <DialogDescription>
                填写工厂基本信息和生产能力
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">工厂名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入工厂名称"
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">联系人 *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="请输入联系人姓名"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPhone">联系电话</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="请输入联系电话"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">联系邮箱</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="请输入联系邮箱"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">工厂地址 *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="请输入工厂地址"
                />
              </div>
              
              <div>
                <Label>生产品类 *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={formData.categories.includes(category) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleCategoryToggle(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="capacity">月产能</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="件/月"
                  />
                </div>
                <div>
                  <Label htmlFor="leadTime">交期</Label>
                  <Input
                    id="leadTime"
                    type="number"
                    value={formData.leadTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, leadTime: e.target.value }))}
                    placeholder="天"
                  />
                </div>
                <div>
                  <Label htmlFor="minOrder">最小订单量</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    value={formData.minOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrder: e.target.value }))}
                    placeholder="件"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">工厂描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请输入工厂描述信息"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddFactory}>
                添加工厂
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索工厂名称、联系人或地址..."
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
            <option value="ACTIVE">活跃</option>
            <option value="INACTIVE">停用</option>
            <option value="SUSPENDED">暂停</option>
          </select>
          
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
          >
            <option value="">全部品类</option>
            {CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
      </div>

      {/* 工厂列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {factories.map((factory) => (
          <Card key={factory.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {factory.name}
                  </CardTitle>
                  <CardDescription>{factory.contactName}</CardDescription>
                </div>
                {getStatusBadge(factory.status)}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {factory.contactPhone || '未提供'}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {factory.contactEmail || '未提供'}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {factory.address}
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">生产品类</div>
                  <div className="flex flex-wrap gap-1">
                    {factory.categories.map(category => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="font-medium">月产能</div>
                    <div>{factory.capacity || '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium">交期</div>
                    <div>{factory.leadTime ? `${factory.leadTime}天` : '-'}</div>
                  </div>
                  <div>
                    <div className="font-medium">试产订单</div>
                    <div>{factory._count.sampleOrders}</div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(factory)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFactory(factory)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {factories.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无工厂</h3>
          <p className="text-muted-foreground mb-4">开始添加第一个合作工厂</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加工厂
          </Button>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑工厂信息</DialogTitle>
            <DialogDescription>
              修改工厂基本信息和生产能力
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">工厂名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入工厂名称"
                />
              </div>
              <div>
                <Label htmlFor="edit-contactName">联系人 *</Label>
                <Input
                  id="edit-contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="请输入联系人姓名"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contactPhone">联系电话</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="请输入联系电话"
                />
              </div>
              <div>
                <Label htmlFor="edit-contactEmail">联系邮箱</Label>
                <Input
                  id="edit-contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="请输入联系邮箱"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-address">工厂地址 *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="请输入工厂地址"
              />
            </div>
            
            <div>
              <Label>生产品类 *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={formData.categories.includes(category) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-capacity">月产能</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="件/月"
                />
              </div>
              <div>
                <Label htmlFor="edit-leadTime">交期</Label>
                <Input
                  id="edit-leadTime"
                  type="number"
                  value={formData.leadTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, leadTime: e.target.value }))}
                  placeholder="天"
                />
              </div>
              <div>
                <Label htmlFor="edit-minOrder">最小订单量</Label>
                <Input
                  id="edit-minOrder"
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, minOrder: e.target.value }))}
                  placeholder="件"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description">工厂描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入工厂描述信息"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditFactory}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}