'use client';

import { 
  Shield, 
  User, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Info,
  ChevronUp
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  level: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserWithRole {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  lastLoginAt?: string;
}

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roles');
  
  // 对话框状态
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  // 表单状态
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    level: 1
  });
  const [permissionForm, setPermissionForm] = useState({
    name: '',
    description: '',
    resource: '',
    action: '',
    level: 1
  });
  const [selectedRole, setSelectedRole] = useState('');
  
  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    resource: 'all',
    level: 'all'
  });
  
  // 说明文档展开/折叠状态
  const [showDocumentation, setShowDocumentation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      // 并行加载所有数据
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        fetch('/api/admin/permissions/roles', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/permissions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!rolesRes.ok || !permissionsRes.ok || !usersRes.ok) {
        throw new Error('加载数据失败');
      }

      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();
      const usersData = await usersRes.json();

      setRoles(rolesData.roles || []);
      setPermissions(permissionsData.permissions || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('加载权限数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error('请输入角色名称');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/permissions/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });

      if (response.ok) {
        toast.success('角色创建成功');
        setShowRoleDialog(false);
        setRoleForm({ name: '', description: '', level: 1 });
        loadData();
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('创建角色错误:', error);
      toast.error('创建角色失败');
    }
  };

  const handleCreatePermission = async () => {
    if (!permissionForm.name.trim() || !permissionForm.resource.trim() || !permissionForm.action.trim()) {
      toast.error('请填写完整信息');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(permissionForm)
      });

      if (response.ok) {
        toast.success('权限创建成功');
        setShowPermissionDialog(false);
        setPermissionForm({ name: '', description: '', resource: '', action: '', level: 1 });
        loadData();
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      console.error('创建权限错误:', error);
      toast.error('创建权限失败');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('请选择用户和角色');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: selectedRole })
      });

      if (response.ok) {
        toast.success('角色分配成功');
        setShowAssignDialog(false);
        setSelectedUser(null);
        setSelectedRole('');
        loadData();
      } else {
        throw new Error('分配失败');
      }
    } catch (error) {
      console.error('分配角色错误:', error);
      toast.error('分配角色失败');
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      level: role.level
    });
    setShowRoleDialog(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      level: permission.level
    });
    setShowPermissionDialog(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/permissions/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleForm)
      });

      if (response.ok) {
        toast.success('角色更新成功');
        setShowRoleDialog(false);
        setEditingRole(null);
        setRoleForm({ name: '', description: '', level: 1 });
        loadData();
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新角色错误:', error);
      toast.error('更新角色失败');
    }
  };

  const handleUpdatePermission = async () => {
    if (!editingPermission) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/permissions/${editingPermission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(permissionForm)
      });

      if (response.ok) {
        toast.success('权限更新成功');
        setShowPermissionDialog(false);
        setEditingPermission(null);
        setPermissionForm({ name: '', description: '', resource: '', action: '', level: 1 });
        loadData();
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新权限错误:', error);
      toast.error('更新权限失败');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除这个角色吗？此操作不可撤销。')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/permissions/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('角色删除成功');
        loadData();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除角色错误:', error);
      toast.error('删除角色失败');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除这个权限吗？此操作不可撤销。')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('权限删除成功');
        loadData();
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除权限错误:', error);
      toast.error('删除权限失败');
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 90) return 'bg-red-100 text-red-800';
    if (level >= 70) return 'bg-orange-100 text-orange-800';
    if (level >= 50) return 'bg-yellow-100 text-yellow-800';
    if (level >= 30) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getResourceColor = (resource: string) => {
    const colors = {
      'user': 'bg-purple-100 text-purple-800',
      'solution': 'bg-green-100 text-green-800',
      'admin': 'bg-red-100 text-red-800',
      'payment': 'bg-blue-100 text-blue-800',
      'system': 'bg-gray-100 text-gray-800'
    };
    return colors[resource as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredPermissions = permissions.filter(permission => {
    if (filters.search && !permission.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.resource !== 'all' && permission.resource !== filters.resource) {
      return false;
    }
    if (filters.level !== 'all' && permission.level.toString() !== filters.level) {
      return false;
    }
    return true;
  });

  const resources = [...new Set(permissions.map(p => p.resource))];
  const levels = [...new Set(permissions.map(p => p.level.toString()))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">权限管理</h1>
          <p className="text-gray-600 mt-2">管理系统角色和权限分配</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowDocumentation(!showDocumentation)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" />
            角色与权限说明
            {showDocumentation ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
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
            onClick={loadData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 角色与权限说明文档 */}
      {showDocumentation && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Info className="w-5 h-5" />
              角色与权限系统说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 角色说明 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">系统角色定义</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">角色名称</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">代码</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">说明</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">主要权限</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">权限级别</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 font-medium">普通用户</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">USER</code></td>
                      <td className="border border-gray-300 px-4 py-3">基础用户，可浏览和购买方案</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">浏览方案</Badge>
                          <Badge variant="outline" className="text-xs">创建订单</Badge>
                          <Badge variant="outline" className="text-xs">查看订单</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-gray-100 text-gray-800">1-20</Badge>
                      </td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">创作者</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">CREATOR</code></td>
                      <td className="border border-gray-300 px-4 py-3">可创建和管理自己的方案，查看收益</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">创建方案</Badge>
                          <Badge variant="outline" className="text-xs">编辑方案</Badge>
                          <Badge variant="outline" className="text-xs">删除方案</Badge>
                          <Badge variant="outline" className="text-xs">查看收益</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800">30-50</Badge>
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">审核员</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">REVIEWER</code></td>
                      <td className="border border-gray-300 px-4 py-3">可审核方案和创作者申请，发布方案</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">审核方案</Badge>
                          <Badge variant="outline" className="text-xs">发布方案</Badge>
                          <Badge variant="outline" className="text-xs">审核申请</Badge>
                          <Badge variant="outline" className="text-xs">查看用户</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-yellow-100 text-yellow-800">50-70</Badge>
                      </td>
                    </tr>
                    <tr className="bg-purple-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">工厂管理员</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">FACTORY_MANAGER</code></td>
                      <td className="border border-gray-300 px-4 py-3">管理工厂和试产，更新订单状态</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">管理工厂</Badge>
                          <Badge variant="outline" className="text-xs">创建工厂</Badge>
                          <Badge variant="outline" className="text-xs">更新订单</Badge>
                          <Badge variant="outline" className="text-xs">查看订单</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-purple-100 text-purple-800">50-70</Badge>
                      </td>
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">管理员</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">ADMIN</code></td>
                      <td className="border border-gray-300 px-4 py-3">拥有系统所有功能权限（除系统设置和角色管理）</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">用户管理</Badge>
                          <Badge variant="outline" className="text-xs">方案管理</Badge>
                          <Badge variant="outline" className="text-xs">订单管理</Badge>
                          <Badge variant="outline" className="text-xs">财务管理</Badge>
                          <Badge variant="outline" className="text-xs">审核管理</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-orange-100 text-orange-800">70-90</Badge>
                      </td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">超级管理员</td>
                      <td className="border border-gray-300 px-4 py-3"><code className="bg-gray-100 px-2 py-1 rounded">SUPER_ADMIN</code></td>
                      <td className="border border-gray-300 px-4 py-3">系统最高权限，包括系统设置和角色管理</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">所有权限</Badge>
                          <Badge variant="outline" className="text-xs">系统设置</Badge>
                          <Badge variant="outline" className="text-xs">角色管理</Badge>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <Badge className="bg-red-100 text-red-800">90-100</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 权限级别说明 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">权限级别说明</h3>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-red-100 text-red-800">90-100</Badge>
                    <span className="text-sm text-gray-700">最高权限级别，仅超级管理员使用</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-orange-100 text-orange-800">70-90</Badge>
                    <span className="text-sm text-gray-700">高级管理权限，管理员使用</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-yellow-100 text-yellow-800">50-70</Badge>
                    <span className="text-sm text-gray-700">专业角色权限，审核员和工厂管理员使用</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-800">30-50</Badge>
                    <span className="text-sm text-gray-700">创作者权限，可创建和管理内容</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gray-100 text-gray-800">1-20</Badge>
                    <span className="text-sm text-gray-700">基础用户权限，仅浏览和购买</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 权限定义说明 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">权限定义说明</h3>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-gray-800">权限命名规范</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      权限采用 <code className="bg-gray-100 px-2 py-1 rounded">资源:操作</code> 的格式，例如：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">users:read</code> - 读取用户信息</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">solutions:create</code> - 创建方案</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">orders:update</code> - 更新订单</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-gray-800">资源类型</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-purple-100 text-purple-800">user</Badge>
                      <Badge className="bg-green-100 text-green-800">solution</Badge>
                      <Badge className="bg-blue-100 text-blue-800">order</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">factory</Badge>
                      <Badge className="bg-pink-100 text-pink-800">finance</Badge>
                      <Badge className="bg-gray-100 text-gray-800">admin</Badge>
                      <Badge className="bg-gray-100 text-gray-800">system</Badge>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 text-gray-800">操作类型</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">read</Badge>
                      <Badge variant="outline">create</Badge>
                      <Badge variant="outline">update</Badge>
                      <Badge variant="outline">delete</Badge>
                      <Badge variant="outline">review</Badge>
                      <Badge variant="outline">publish</Badge>
                      <Badge variant="outline">manage</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 使用指南 */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">使用指南</h3>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <h4 className="font-medium mb-1 text-gray-800">1. 角色管理</h4>
                    <p className="text-gray-600">
                      系统角色（标记为"系统角色"）是预定义角色，不能删除。您可以创建自定义角色，但建议谨慎操作。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-gray-800">2. 权限分配</h4>
                    <p className="text-gray-600">
                      每个角色可以拥有多个权限。权限级别越高，表示该权限的重要性越大。建议根据实际业务需求设置权限级别。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-gray-800">3. 用户角色分配</h4>
                    <p className="text-gray-600">
                      用户可以被分配一个或多个角色。多个角色的权限会自动合并（取并集）。系统会检查用户是否拥有所需角色或权限。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-gray-800">4. 权限检查</h4>
                    <p className="text-gray-600">
                      在 API 和前端组件中，系统会自动检查用户是否拥有执行操作所需的角色或权限。如果权限不足，操作将被拒绝。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-gray-800">5. 安全建议</h4>
                    <p className="text-gray-600">
                      • 不要随意删除系统角色和权限<br/>
                      • 创建新角色时，建议从低权限级别开始<br/>
                      • 定期审查用户角色分配，确保权限最小化原则<br/>
                      • 超级管理员权限应仅分配给可信用户
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 筛选器面板 */}
      {showFilters && activeTab === 'permissions' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">权限筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">搜索权限名称</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="搜索权限..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="resource">资源类型</Label>
                <select 
                  value={filters.resource} 
                  onChange={(e) => setFilters(prev => ({ ...prev, resource: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部资源</option>
                  {resources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="level">权限级别</Label>
                <select 
                  value={filters.level} 
                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部级别</option>
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">角色管理</TabsTrigger>
          <TabsTrigger value="permissions">权限列表</TabsTrigger>
          <TabsTrigger value="users">用户分配</TabsTrigger>
        </TabsList>

        {/* 角色管理标签页 */}
        <TabsContent value="roles" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">系统角色</h2>
            <Button onClick={() => setShowRoleDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建角色
            </Button>
          </div>

          <div className="grid gap-6">
            {roles.map(role => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        {role.name}
                        {role.isSystem && (
                          <Badge variant="secondary">系统角色</Badge>
                        )}
                      </CardTitle>
                      <p className="text-gray-600 mt-1">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getLevelColor(role.level)}>
                        级别 {role.level}
                      </Badge>
                      <Badge variant="outline">
                        {role.userCount} 用户
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">权限数量</span>
                      <span className="font-medium">{role.permissions.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">创建时间</span>
                      <span className="text-sm">
                        {new Date(role.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  {role.permissions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">包含权限</h4>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.slice(0, 5).map(permission => (
                          <Badge key={permission.id} variant="outline" className="text-xs">
                            {permission.name}
                          </Badge>
                        ))}
                        {role.permissions.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 5} 更多
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {!role.isSystem && (
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        onClick={() => handleEditRole(role)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        编辑
                      </Button>
                      <Button
                        onClick={() => handleDeleteRole(role.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 权限列表标签页 */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">系统权限</h2>
            <Button onClick={() => setShowPermissionDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建权限
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredPermissions.map(permission => (
              <Card key={permission.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{permission.name}</h3>
                        <Badge className={getResourceColor(permission.resource)}>
                          {permission.resource}
                        </Badge>
                        <Badge className={getLevelColor(permission.level)}>
                          级别 {permission.level}
                        </Badge>
                        {permission.isSystem && (
                          <Badge variant="secondary">系统权限</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{permission.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>操作: {permission.action}</span>
                        <span>资源: {permission.resource}</span>
                        <span>创建: {new Date(permission.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    
                    {!permission.isSystem && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEditPermission(permission)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          编辑
                        </Button>
                        <Button
                          onClick={() => handleDeletePermission(permission.id)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 用户分配标签页 */}
        <TabsContent value="users" className="space-y-6">
          <h2 className="text-xl font-semibold">用户角色分配</h2>

          <div className="grid gap-4">
            {users.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge className={getLevelColor(
                        roles.find(r => r.name === user.role)?.level || 1
                      )}>
                        {user.role}
                      </Badge>
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole(user.role);
                          setShowAssignDialog(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        分配角色
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 创建/编辑角色对话框 */}
      <Dialog open={showRoleDialog} onOpenChange={(open) => {
        setShowRoleDialog(open);
        if (!open) {
          setEditingRole(null);
          setRoleForm({ name: '', description: '', level: 1 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? '编辑角色' : '创建新角色'}
            </DialogTitle>
            <DialogDescription>
              {editingRole ? '修改角色信息和权限级别' : '创建新的系统角色并设置权限级别'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">角色名称</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：内容审核员"
              />
            </div>
            
            <div>
              <Label htmlFor="roleDescription">角色描述</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述角色的职责和权限范围"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="roleLevel">权限级别 (1-100)</Label>
              <Input
                id="roleLevel"
                type="number"
                min="1"
                max="100"
                value={roleForm.level}
                onChange={(e) => setRoleForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowRoleDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={editingRole ? handleUpdateRole : handleCreateRole}
              disabled={!roleForm.name.trim()}
            >
              {editingRole ? '更新角色' : '创建角色'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建/编辑权限对话框 */}
      <Dialog open={showPermissionDialog} onOpenChange={(open) => {
        setShowPermissionDialog(open);
        if (!open) {
          setEditingPermission(null);
          setPermissionForm({ name: '', description: '', resource: '', action: '', level: 1 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? '编辑权限' : '创建新权限'}
            </DialogTitle>
            <DialogDescription>
              {editingPermission ? '修改权限信息和级别' : '创建新的系统权限'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="permissionName">权限名称</Label>
              <Input
                id="permissionName"
                value={permissionForm.name}
                onChange={(e) => setPermissionForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：查看用户列表"
              />
            </div>
            
            <div>
              <Label htmlFor="permissionDescription">权限描述</Label>
              <Textarea
                id="permissionDescription"
                value={permissionForm.description}
                onChange={(e) => setPermissionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述权限的具体功能和用途"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resource">资源类型</Label>
                <Input
                  id="resource"
                  value={permissionForm.resource}
                  onChange={(e) => setPermissionForm(prev => ({ ...prev, resource: e.target.value }))}
                  placeholder="例如：user"
                />
              </div>
              
              <div>
                <Label htmlFor="action">操作类型</Label>
                <Input
                  id="action"
                  value={permissionForm.action}
                  onChange={(e) => setPermissionForm(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="例如：read"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="permissionLevel">权限级别 (1-100)</Label>
              <Input
                id="permissionLevel"
                type="number"
                min="1"
                max="100"
                value={permissionForm.level}
                onChange={(e) => setPermissionForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPermissionDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={editingPermission ? handleUpdatePermission : handleCreatePermission}
              disabled={!permissionForm.name.trim() || !permissionForm.resource.trim() || !permissionForm.action.trim()}
            >
              {editingPermission ? '更新权限' : '创建权限'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分配角色对话框 */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        setShowAssignDialog(open);
        if (!open) {
          setSelectedUser(null);
          setSelectedRole('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配角色</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.email} 分配新的系统角色
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignRole">选择角色</Label>
              <select 
                id="assignRole"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择角色</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>
                    {role.name} (级别 {role.level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAssignDialog(false)} variant="outline">
              取消
            </Button>
            <Button 
              onClick={handleAssignRole}
              disabled={!selectedRole}
            >
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}