'use client';

import { 
  Calendar, 
  User, 
  Shield, 
  FileText, 
  Settings, 
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  timestamp: string;
  duration?: number;
}

interface AuditStats {
  total: number;
  today: number;
  success: number;
  failed: number;
  warning: number;
  byAction: Array<{ action: string; count: number }>;
  byResource: Array<{ resource: string; count: number }>;
  byUser: Array<{ user: string; count: number }>;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: 'all',
    resource: 'all',
    status: 'all',
    user: 'all',
    dateFrom: '',
    dateTo: '',
    ipAddress: ''
  });
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadAuditLogs();
    loadAuditStats();
  }, [pagination.page, pagination.limit]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.resource !== 'all' && { resource: filters.resource }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.user !== 'all' && { user: filters.user }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.ipAddress && { ipAddress: filters.ipAddress })
      });

      const response = await fetch(`/api/admin/audit-logs?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('获取审计日志失败');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('加载审计日志失败:', error);
      toast.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/audit-logs/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('加载审计统计失败:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const applyFilters = () => {
    loadAuditLogs();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      action: 'all',
      resource: 'all',
      status: 'all',
      user: 'all',
      dateFrom: '',
      dateTo: '',
      ipAddress: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/audit-logs/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('导出成功');
      } else {
        throw new Error('导出失败');
      }
    } catch (error) {
      console.error('导出审计日志失败:', error);
      toast.error('导出失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('READ') || action.includes('VIEW')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    return `${duration}ms`;
  };

  const getCurrentLogs = () => {
    let filtered = logs;

    if (activeTab === 'success') {
      filtered = filtered.filter(log => log.status === 'SUCCESS');
    } else if (activeTab === 'failed') {
      filtered = filtered.filter(log => log.status === 'FAILED');
    } else if (activeTab === 'warning') {
      filtered = filtered.filter(log => log.status === 'WARNING');
    }

    return filtered;
  };

  const actions = [...new Set(logs.map(log => log.action))];
  const resources = [...new Set(logs.map(log => log.resourceType))];
  const users = [...new Set(logs.map(log => log.userEmail))];

  if (loading && logs.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">审计日志</h1>
          <p className="text-gray-600 mt-2">监控系统操作和安全事件</p>
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
            onClick={exportLogs}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button
            onClick={loadAuditLogs}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总操作数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                今日: {stats.today}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成功操作</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.success.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.success / stats.total) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">失败操作</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.failed / stats.total) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">警告操作</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.warning.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.warning / stats.total) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选器面板 */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">高级筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">搜索操作或资源</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="搜索操作、资源..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="action">操作类型</Label>
                <select 
                  value={filters.action} 
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部操作</option>
                  {actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="resource">资源类型</Label>
                <select 
                  value={filters.resource} 
                  onChange={(e) => handleFilterChange('resource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部资源</option>
                  {resources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status">状态</Label>
                <select 
                  value={filters.status} 
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部状态</option>
                  <option value="SUCCESS">成功</option>
                  <option value="FAILED">失败</option>
                  <option value="WARNING">警告</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <Label htmlFor="user">用户</Label>
                <select 
                  value={filters.user} 
                  onChange={(e) => handleFilterChange('user', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部用户</option>
                  {users.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="dateFrom">开始日期</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">结束日期</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ipAddress">IP地址</Label>
                <Input
                  id="ipAddress"
                  placeholder="搜索IP地址..."
                  value={filters.ipAddress}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={resetFilters} variant="outline">
                重置筛选
              </Button>
              <Button onClick={applyFilters}>
                应用筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">全部日志</TabsTrigger>
          <TabsTrigger value="success">成功操作</TabsTrigger>
          <TabsTrigger value="failed">失败操作</TabsTrigger>
          <TabsTrigger value="warning">警告操作</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* 分页信息 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              显示 {getCurrentLogs().length} 条记录，共 {pagination.total.toLocaleString()} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                variant="outline"
                size="sm"
              >
                上一页
              </Button>
              <span className="text-sm">
                第 {pagination.page} 页，共 {pagination.pages} 页
              </span>
              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                variant="outline"
                size="sm"
              >
                下一页
              </Button>
            </div>
          </div>

          {/* 日志列表 */}
          <div className="space-y-4">
            {getCurrentLogs().map(log => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline">
                        {log.resourceType}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">用户:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{log.userName || log.userEmail}</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">资源:</span>
                      <div className="mt-1">
                        {log.resourceName ? (
                          <span className="text-blue-600">{log.resourceName}</span>
                        ) : (
                          <span className="text-gray-500">未指定</span>
                        )}
                        {log.resourceId && (
                          <div className="text-xs text-gray-500">ID: {log.resourceId}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">技术信息:</span>
                      <div className="mt-1 space-y-1">
                        <div className="text-xs text-gray-500">IP: {log.ipAddress}</div>
                        <div className="text-xs text-gray-500">
                          耗时: {formatDuration(log.duration)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {Object.keys(log.details).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">操作详情:</div>
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">
                    User Agent: {log.userAgent}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 空状态 */}
          {getCurrentLogs().length === 0 && !loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无审计日志</h3>
                <p className="text-gray-600">当前没有符合条件的审计日志记录</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}