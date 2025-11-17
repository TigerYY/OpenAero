'use client';

import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';

type UserRole = 'USER' | 'CREATOR' | 'REVIEWER' | 'FACTORY_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[]; // 多角色数组
  role?: UserRole; // 向后兼容：单一角色（已废弃）
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  solutionCount?: number;
  reviewCount?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    emailVerified: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  // 对话框状态
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 表单状态
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    roles: ['USER'] as UserRole[] // 多角色数组
  });
  const [suspendReason, setSuspendReason] = useState('');
  const [batchAction, setBatchAction] = useState<'role' | 'status'>('role');
  const [batchValue, setBatchValue] = useState('');

  useEffect(() => {
    console.log('[AdminUsersPage] useEffect 触发，开始加载用户列表');
    loadUsers();
  }, []);

  // 筛选逻辑
  useEffect(() => {
    let filtered = users;

    // 搜索筛选
    if (filters.search) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(filters.search.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // 角色筛选（支持多角色）
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => {
        const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
        return userRoles.includes(filters.role as UserRole);
      });
    }

    // 状态筛选
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    // 邮箱验证筛选
    if (filters.emailVerified !== 'all') {
      const verified = filters.emailVerified === 'verified';
      filtered = filtered.filter(user => user.emailVerified === verified);
    }

    // 日期筛选
    if (filters.dateFrom) {
      filtered = filtered.filter(user =>
        new Date(user.createdAt) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(user =>
        new Date(user.createdAt) <= new Date(filters.dateTo)
      );
    }

    setFilteredUsers(filtered);
  }, [users, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('[AdminUsersPage] 开始加载用户列表...');

      const response = await fetch('/api/admin/users', {
        credentials: 'include', // 确保发送 cookies
      });

      console.log('[AdminUsersPage] API 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }));
        console.error('[AdminUsersPage] API 错误响应:', errorData);
        throw new Error(errorData.error || `获取用户列表失败 (${response.status})`);
      }

      const data = await response.json();
      console.log('[AdminUsersPage] API 响应数据:', {
        success: data.success,
        hasData: !!data.data,
        hasItems: !!data.data?.items,
        itemsLength: data.data?.items?.length || 0,
        pagination: data.data?.pagination,
        dataType: typeof data.data,
      });
      
      // API 返回格式: { success: true, data: { items: [...], pagination: {...} } }
      // 与 applications 页面保持一致的数据提取逻辑
      const usersList = data.data?.items || data.data || [];
      const validUsersList = Array.isArray(usersList) ? usersList : [];
      
      console.log('[AdminUsersPage] 解析后的用户列表:', {
        count: validUsersList.length,
        firstUser: validUsersList[0] || null,
      });
      
      if (validUsersList.length === 0) {
        console.warn('[AdminUsersPage] 用户列表为空');
      }
      
      setUsers(validUsersList);
    } catch (error) {
      console.error('[AdminUsersPage] 获取用户列表错误:', error);
      const errorMessage = error instanceof Error ? error.message : '获取用户列表失败';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : ['USER']);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      roles: userRoles
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    if (editForm.roles.length === 0) {
      toast.error('至少需要选择一个角色');
      return;
    }

    setSaving(true);
    try {
      let infoUpdated = false;
      let rolesUpdated = false;

      const originalRoles = (Array.isArray(selectedUser.roles) ? selectedUser.roles : (selectedUser.role ? [selectedUser.role] : [])).sort();
      const newRoles = [...editForm.roles].sort();
      const rolesChanged = JSON.stringify(originalRoles) !== JSON.stringify(newRoles);

      const infoPayload: { firstName?: string; lastName?: string } = {};
      
      // 验证输入并构建请求载荷
      const firstNameInput = editForm.firstName.trim();
      const lastNameInput = editForm.lastName.trim();
      
      // 只有在用户输入非空值且与原值不同时才添加
      if (firstNameInput && firstNameInput !== (selectedUser.firstName || '')) {
        infoPayload.firstName = firstNameInput;
      }
      if (lastNameInput && lastNameInput !== (selectedUser.lastName || '')) {
        infoPayload.lastName = lastNameInput;
      }
      
      const infoChanged = Object.keys(infoPayload).length > 0;
      
      // 表单验证：如果基本信息有输入，检查格式
      if ((firstNameInput || lastNameInput) && !infoChanged) {
        toast.error('基本信息与当前值相同，无需修改');
        return;
      }

      if (!infoChanged && !rolesChanged) {
        setShowEditDialog(false);
        return; // 没有检测到任何更改
      }

      if (infoChanged) {
        console.log('[AdminUsersPage] 开始更新用户基本信息:', {
          userId: selectedUser.id,
          infoPayload,
          endpoint: `/api/admin/users/${selectedUser.id}`
        });
        
        const infoResponse = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(infoPayload),
        });
        
        console.log('[AdminUsersPage] 基本信息更新API响应:', {
          status: infoResponse.status,
          statusText: infoResponse.statusText,
          ok: infoResponse.ok
        });
        
        if (!infoResponse.ok) {
          const errorData = await infoResponse.json().catch(() => ({}));
          console.error('[AdminUsersPage] 基本信息更新失败:', errorData);
          
          // 提供更具体的错误信息
          let errorMessage = '更新用户基本信息失败';
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (infoResponse.status === 400) {
            errorMessage = '请检查表单错误：数据格式不正确';
          } else if (infoResponse.status === 403) {
            errorMessage = '权限不足，无法修改此用户信息';
          } else if (infoResponse.status === 404) {
            errorMessage = '用户不存在';
          } else if (infoResponse.status === 500) {
            errorMessage = '服务器错误，请稍后重试';
          }
          
          throw new Error(errorMessage);
        }
        
        const responseData = await infoResponse.json();
        console.log('[AdminUsersPage] 基本信息更新成功:', responseData);
        infoUpdated = true;
      }

      if (rolesChanged) {
        console.log('[AdminUsersPage] 开始更新用户角色:', {
          userId: selectedUser.id,
          currentRoles: editForm.roles,
          endpoint: `/api/admin/users/${selectedUser.id}/role`
        });
        
        const roleResponse = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ roles: editForm.roles }),
        });
        
        console.log('[AdminUsersPage] 角色更新API响应:', {
          status: roleResponse.status,
          statusText: roleResponse.statusText,
          ok: roleResponse.ok
        });
        
        if (!roleResponse.ok) {
          const errorData = await roleResponse.json().catch(() => ({}));
          console.error('[AdminUsersPage] 角色更新失败:', errorData);
          throw new Error(errorData.error || '更新用户角色失败');
        }
        
        const responseData = await roleResponse.json();
        console.log('[AdminUsersPage] 角色更新成功:', responseData);
        rolesUpdated = true;
      }

      let successMessage = '更新成功';
      if (infoUpdated && rolesUpdated) {
        successMessage = '用户信息和角色已更新';
      } else if (infoUpdated) {
        successMessage = '用户信息已更新';
      } else if (rolesUpdated) {
        successMessage = '用户角色已更新';
      }

      toast.success(successMessage);
      setShowEditDialog(false);
      await loadUsers();

    } catch (error) {
      console.error('更新用户信息错误:', error);
      const errorMessage = error instanceof Error ? error.message : '更新操作失败';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser || !suspendReason.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'SUSPENDED',
          reason: suspendReason
        }),
      });

      if (response.ok) {
        toast.success('用户已暂停');
        setShowSuspendDialog(false);
        setSuspendReason('');
        loadUsers();
      } else {
        throw new Error('操作失败');
      }
    } catch (error) {
      console.error('暂停用户错误:', error);
      toast.error('暂停用户失败');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('用户删除成功');
        setShowDeleteDialog(false);
        loadUsers();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除用户错误:', error);
      toast.error('删除用户失败');
    }
  };

  const handleBatchSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const currentUsers = getCurrentUsers();
    if (checked) {
      setSelectedUsers(currentUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBatchAction = async () => {
    if (selectedUsers.length === 0) {
      toast.error('请选择要操作的用户');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action: batchAction,
          value: batchValue
        }),
      });

      if (response.ok) {
        toast.success(`批量操作成功，影响了 ${selectedUsers.length} 个用户`);
        setShowBatchDialog(false);
        setSelectedUsers([]);
        loadUsers();
      } else {
        throw new Error('批量操作失败');
      }
    } catch (error) {
      console.error('批量操作错误:', error);
      toast.error('批量操作失败');
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      emailVerified: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const getCurrentUsers = () => {
    const sourceUsers = (filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.emailVerified !== 'all' || filters.dateFrom || filters.dateTo)
      ? filteredUsers
      : users;

    if (activeTab === 'all') {
      return sourceUsers;
    }
    
    return sourceUsers.filter(user => {
      const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
      switch (activeTab) {
        case 'customers':
          return userRoles.includes('USER');
        case 'creators':
          return userRoles.includes('CREATOR');
        case 'admins':
          return userRoles.includes('ADMIN') || userRoles.includes('SUPER_ADMIN');
        case 'suspended':
          return user.status === 'SUSPENDED';
        default:
          return true;
      }
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CREATOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVIEWER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FACTORY_MANAGER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'USER':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '超级管理员';
      case 'ADMIN':
        return '管理员';
      case 'CREATOR':
        return '创作者';
      case 'REVIEWER':
        return '审核员';
      case 'FACTORY_MANAGER':
        return '工厂管理员';
      case 'USER':
        return '普通用户';
      default:
        return '未知';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '活跃';
      case 'INACTIVE':
        return '未激活';
      case 'SUSPENDED':
        return '已暂停';
      case 'DELETED':
        return '已删除';
      default:
        return '未知';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const currentUsers = getCurrentUsers();

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-2">管理系统用户账户和权限</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            筛选器
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            onClick={loadUsers}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选器面板 */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">用户筛选</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">搜索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="搜索邮箱、姓名..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="role">角色</Label>
                <select 
                  value={filters.role} 
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部角色</option>
                  <option value="USER">普通用户</option>
                  <option value="CREATOR">创作者</option>
                  <option value="REVIEWER">审核员</option>
                  <option value="FACTORY_MANAGER">工厂管理员</option>
                  <option value="ADMIN">管理员</option>
                  <option value="SUPER_ADMIN">超级管理员</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status">状态</Label>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部状态</option>
                  <option value="ACTIVE">活跃</option>
                  <option value="INACTIVE">未激活</option>
                  <option value="SUSPENDED">已暂停</option>
                  <option value="DELETED">已删除</option>
                </select>
              </div>

              <div>
                <Label htmlFor="emailVerified">邮箱验证</Label>
                <select 
                  value={filters.emailVerified} 
                  onChange={(e) => setFilters(prev => ({ ...prev, emailVerified: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="verified">已验证</option>
                  <option value="unverified">未验证</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom">注册开始日期</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">注册结束日期</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={resetFilters} variant="outline">
                重置筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 批量操作栏 */}
      {selectedUsers.length > 0 && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  已选择 {selectedUsers.length} 个用户
                </span>
                <Button
                  onClick={() => setSelectedUsers([])}
                  variant="outline"
                  size="sm"
                >
                  取消选择
                </Button>
              </div>
              <Button
                onClick={() => setShowBatchDialog(true)}
                size="sm"
              >
                批量操作
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">全部用户</TabsTrigger>
          <TabsTrigger value="customers">客户</TabsTrigger>
          <TabsTrigger value="creators">创作者</TabsTrigger>
          <TabsTrigger value="admins">管理员</TabsTrigger>
          <TabsTrigger value="suspended">已暂停</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无用户</h3>
                <p className="text-gray-600">当前没有符合条件的用户</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 全选控制 */}
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label className="text-sm font-medium">
                  全选 ({currentUsers.length} 个用户)
                </Label>
              </div>

              {/* 用户列表 */}
              <div className="grid gap-6">
                {currentUsers.map((user) => (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4 flex-1">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleBatchSelect(user.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle className="text-lg">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.email
                                }
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 显示所有角色 */}
                                {(Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : [])).map((role) => (
                                  <Badge key={role} className={getRoleColor(role)}>
                                    {getRoleText(role)}
                                  </Badge>
                                ))}
                                <Badge className={getStatusColor(user.status)}>
                                  {getStatusText(user.status)}
                                </Badge>
                                {user.emailVerified && (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1 min-w-[200px]">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate" title={user.email}>{user.email}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-[150px]">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>注册: {formatDate(user.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4 flex-shrink-0" />
                                <span>方案: {user.solutionCount || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                <span>审核: {user.reviewCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEditUser(user)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            编辑
                          </Button>
                          {user.status === 'ACTIVE' && (
                            <Button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowSuspendDialog(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                            >
                              <XCircle className="w-3 h-3" />
                              暂停
                            </Button>
                          )}
                          {(() => {
                            const userRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
                            return !userRoles.includes('ADMIN') && !userRoles.includes('SUPER_ADMIN') ? (
                              <Button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteDialog(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                删除
                              </Button>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 编辑用户对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              修改用户的基本信息和角色权限
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">名字</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">姓氏</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label>角色（可多选）</Label>
              <div className="space-y-2 mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                {(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={editForm.roles.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditForm(prev => ({
                            ...prev,
                            roles: [...prev.roles, role]
                          }));
                        } else {
                          setEditForm(prev => ({
                            ...prev,
                            roles: prev.roles.filter(r => r !== role)
                          }));
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`role-${role}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {getRoleText(role)}
                    </Label>
                  </div>
                ))}
                {editForm.roles.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">至少需要选择一个角色</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowEditDialog(false)} 
              variant="outline"
              disabled={saving}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 暂停用户对话框 */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>暂停用户账户</DialogTitle>
            <DialogDescription>
              请填写暂停用户账户的原因
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="suspendReason">暂停原因</Label>
              <Textarea
                id="suspendReason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="请详细说明暂停用户账户的原因..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSuspendDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={handleSuspendUser}
              disabled={!suspendReason.trim()}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              确认暂停
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用户对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户账户</DialogTitle>
            <DialogDescription>
              此操作将永久删除用户账户及其相关数据，请谨慎操作。
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">警告</span>
            </div>
            <p className="text-red-700 text-sm mt-2">
              删除用户账户将同时删除该用户的所有方案、审核记录和相关数据。此操作不可撤销。
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDeleteDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量操作对话框 */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量操作用户</DialogTitle>
            <DialogDescription>
              对选中的 {selectedUsers.length} 个用户执行批量操作
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="batchAction">操作类型</Label>
              <select 
                value={batchAction} 
                onChange={(e) => setBatchAction(e.target.value as 'role' | 'status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="role">修改角色</option>
                <option value="status">修改状态</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="batchValue">
                {batchAction === 'role' ? '目标角色' : '目标状态'}
              </Label>
              <select 
                value={batchValue} 
                onChange={(e) => setBatchValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {batchAction === 'role' ? (
                  <>
                    <option value="">选择角色</option>
                    <option value="USER">普通用户</option>
                    <option value="CREATOR">创作者</option>
                    <option value="REVIEWER">审核员</option>
                    <option value="FACTORY_MANAGER">工厂管理员</option>
                    <option value="ADMIN">管理员</option>
                    <option value="SUPER_ADMIN">超级管理员</option>
                  </>
                ) : (
                  <>
                    <option value="">选择状态</option>
                    <option value="ACTIVE">活跃</option>
                    <option value="INACTIVE">未激活</option>
                    <option value="SUSPENDED">已暂停</option>
                    <option value="DELETED">已删除</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowBatchDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={handleBatchAction}
              disabled={!batchValue}
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}