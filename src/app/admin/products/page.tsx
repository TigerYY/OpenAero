'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Tag,
  Warehouse,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  sku: string;
  barcode?: string;
  brand?: string;
  model?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  categoryId: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  color?: string;
  material?: string;
  images: string[];
  videos: string[];
  documents: string[];
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED' | 'DISCONTINUED';
  isActive: boolean;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  viewCount: number;
  salesCount: number;
  rating?: number;
  reviewCount: number;
  solutionId?: string;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  solution?: {
    id: string;
    title: string;
    status: string;
  };
  inventory?: {
    quantity: number;
    available: number;
    status: string;
  };
  _count: {
    cartItems: number;
    orderItems: number;
    reviews: number;
  };
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  shortDesc: string;
  sku: string;
  barcode: string;
  brand: string;
  model: string;
  price: number;
  originalPrice: number;
  costPrice: number;
  categoryId: string;
  weight: number;
  color: string;
  material: string;
  images: string[];
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  solutionId: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    shortDesc: '',
    sku: '',
    barcode: '',
    brand: '',
    model: '',
    price: 0,
    originalPrice: 0,
    costPrice: 0,
    categoryId: '',
    weight: 0,
    color: '',
    material: '',
    images: [],
    status: 'DRAFT',
    isActive: true,
    isFeatured: false,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    solutionId: '',
  });

  // 获取商品列表
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { categoryId: categoryFilter }),
      });

      const response = await fetch(`/api/admin/products?${params}`);
      if (!response.ok) throw new Error('获取商品列表失败');

      const data = await response.json();
      setProducts(data.products);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('获取商品列表失败:', error);
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取商品分类
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('获取分类列表失败');

      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      toast.error('获取分类列表失败');
    }
  };

  // 创建商品
  const handleCreateProduct = async () => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '创建商品失败');
      }

      toast.success('商品创建成功');
      setShowCreateDialog(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('创建商品失败:', error);
      toast.error(error instanceof Error ? error.message : '创建商品失败');
    }
  };

  // 更新商品
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新商品失败');
      }

      toast.success('商品更新成功');
      setShowEditDialog(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('更新商品失败:', error);
      toast.error(error instanceof Error ? error.message : '更新商品失败');
    }
  };

  // 删除商品
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除商品失败');
      }

      toast.success('商品删除成功');
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('删除商品失败:', error);
      toast.error(error instanceof Error ? error.message : '删除商品失败');
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      shortDesc: '',
      sku: '',
      barcode: '',
      brand: '',
      model: '',
      price: 0,
      originalPrice: 0,
      costPrice: 0,
      categoryId: '',
      weight: 0,
      color: '',
      material: '',
      images: [],
      status: 'DRAFT',
      isActive: true,
      isFeatured: false,
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      solutionId: '',
    });
  };

  // 打开编辑对话框
  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      shortDesc: product.shortDesc || '',
      sku: product.sku,
      barcode: product.barcode || '',
      brand: product.brand || '',
      model: product.model || '',
      price: product.price,
      originalPrice: product.originalPrice || 0,
      costPrice: product.costPrice || 0,
      categoryId: product.categoryId,
      weight: product.weight || 0,
      color: product.color || '',
      material: product.material || '',
      images: product.images,
      status: product.status,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle || '',
      metaDescription: product.metaDescription || '',
      metaKeywords: product.metaKeywords || '',
      solutionId: product.solutionId || '',
    });
    setShowEditDialog(true);
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: '草稿', variant: 'secondary' as const },
      PENDING: { label: '待审核', variant: 'warning' as const },
      APPROVED: { label: '已审核', variant: 'success' as const },
      PUBLISHED: { label: '已发布', variant: 'success' as const },
      ARCHIVED: { label: '已归档', variant: 'secondary' as const },
      DISCONTINUED: { label: '已停产', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 获取库存状态徽章
  const getInventoryBadge = (inventory?: Product['inventory']) => {
    if (!inventory) return <Badge variant="secondary">无库存</Badge>;

    if (inventory.available === 0) {
      return <Badge variant="destructive">缺货</Badge>;
    } else if (inventory.available <= 10) {
      return <Badge variant="warning">库存不足</Badge>;
    } else {
      return <Badge variant="success">有库存</Badge>;
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, searchTerm, statusFilter, categoryFilter]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">商品管理</h1>
          <p className="text-gray-600 mt-2">管理平台商品信息、库存和状态</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          添加商品
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索商品名称、SKU、品牌..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="DRAFT">草稿</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已审核</option>
              <option value="PUBLISHED">已发布</option>
              <option value="ARCHIVED">已归档</option>
              <option value="DISCONTINUED">已停产</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchProducts} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 商品列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            商品列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">商品信息</th>
                      <th className="text-left p-3">分类</th>
                      <th className="text-left p-3">价格</th>
                      <th className="text-left p-3">库存</th>
                      <th className="text-left p-3">状态</th>
                      <th className="text-left p-3">统计</th>
                      <th className="text-left p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {product.images.length > 0 && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              {product.brand && (
                                <div className="text-sm text-gray-500">品牌: {product.brand}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{product.category.name}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{formatCurrency(product.price)}</div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="text-sm text-gray-500 line-through">
                              {formatCurrency(product.originalPrice)}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {getInventoryBadge(product.inventory)}
                            {product.inventory && (
                              <div className="text-sm text-gray-500">
                                可用: {product.inventory.available}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(product.status)}
                            <div className="flex gap-1">
                              {product.isActive && <Badge variant="success" className="text-xs">启用</Badge>}
                              {product.isFeatured && <Badge variant="warning" className="text-xs">推荐</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {product.viewCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {product.salesCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {product.reviewCount}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-600">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 创建商品对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加商品</DialogTitle>
            <DialogDescription>
              填写商品基本信息，创建新的商品记录。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">商品名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入商品名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL标识符 *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="product-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">商品编码 *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">商品分类 *</Label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">售价 *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice">原价</Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">品牌</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="品牌名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">型号</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="型号"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="shortDesc">简短描述</Label>
              <Input
                id="shortDesc"
                value={formData.shortDesc}
                onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                placeholder="商品简短描述"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">详细描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="商品详细描述"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">草稿</option>
                <option value="PENDING">待审核</option>
                <option value="PUBLISHED">已发布</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>选项</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                  />
                  <Label htmlFor="isActive">启用</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: !!checked })}
                  />
                  <Label htmlFor="isFeatured">推荐</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateProduct}>
              创建商品
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑商品对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑商品</DialogTitle>
            <DialogDescription>
              修改商品信息，更新后将立即生效。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">商品名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入商品名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">URL标识符 *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="product-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">商品编码 *</Label>
              <Input
                id="edit-sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">商品分类 *</Label>
              <select
                id="edit-categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">售价 *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-originalPrice">原价</Label>
              <Input
                id="edit-originalPrice"
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brand">品牌</Label>
              <Input
                id="edit-brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="品牌名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">型号</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="型号"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-shortDesc">简短描述</Label>
              <Input
                id="edit-shortDesc"
                value={formData.shortDesc}
                onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                placeholder="商品简短描述"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-description">详细描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="商品详细描述"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">状态</Label>
              <select
                id="edit-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">草稿</option>
                <option value="PENDING">待审核</option>
                <option value="APPROVED">已审核</option>
                <option value="PUBLISHED">已发布</option>
                <option value="ARCHIVED">已归档</option>
                <option value="DISCONTINUED">已停产</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>选项</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                  />
                  <Label htmlFor="edit-isActive">启用</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: !!checked })}
                  />
                  <Label htmlFor="edit-isFeatured">推荐</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateProduct}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除商品 "{selectedProduct?.name}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}