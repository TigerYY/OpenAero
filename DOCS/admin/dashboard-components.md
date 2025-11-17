# 管理员仪表板组件使用文档

## 概述

本文档介绍管理员仪表板相关组件的使用方法、属性和最佳实践。

## 组件列表

### 1. DashboardCharts

数据可视化图表组件，支持多种图表类型。

#### 导入

```tsx
import { DashboardCharts } from '@/components/admin/DashboardCharts';
```

#### 属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `timeRange` | number | 否 | 30 | 时间范围（天数） |
| `className` | string | 否 | '' | 自定义CSS类名 |

#### 使用示例

```tsx
<DashboardCharts timeRange={30} className="my-4" />
```

#### 功能特性

- 自动懒加载图表组件
- 支持Suspense加载状态
- 响应式设计
- 错误处理和重试

#### 图表类型

1. **平台趋势图** - 折线图，显示方案和用户增长趋势
2. **分类分布图** - 饼图，显示方案分类分布
3. **状态分布图** - 柱状图，显示方案状态分布
4. **收入趋势图** - 折线图，显示收入变化趋势

---

### 2. ActivityFeed

实时活动流组件，显示平台最新活动。

#### 导入

```tsx
import { ActivityFeed } from '@/components/admin/ActivityFeed';
```

#### 属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | number | 否 | 20 | 显示的活动数量 |
| `autoRefresh` | boolean | 否 | true | 是否自动刷新 |
| `refreshInterval` | number | 否 | 30 | 自动刷新间隔（秒） |
| `className` | string | 否 | '' | 自定义CSS类名 |

#### 使用示例

```tsx
<ActivityFeed 
  limit={20} 
  autoRefresh={true}
  refreshInterval={30}
  className="my-4"
/>
```

#### 功能特性

- 支持活动类型筛选
- 自动刷新机制
- 手动刷新按钮
- 时间格式化显示
- 活动类型图标和颜色标识

#### 活动类型

- `user_registration`: 用户注册
- `solution_submission`: 方案提交
- `review_completion`: 审核完成
- `order_creation`: 订单创建

---

### 3. AlertPanel

系统预警面板组件，显示关键指标异常。

#### 导入

```tsx
import { AlertPanel } from '@/components/admin/AlertPanel';
```

#### 属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `timeRange` | number | 否 | 30 | 时间范围（天数） |
| `autoRefresh` | boolean | 否 | true | 是否自动刷新 |
| `refreshInterval` | number | 否 | 60 | 自动刷新间隔（秒） |
| `className` | string | 否 | '' | 自定义CSS类名 |

#### 使用示例

```tsx
<AlertPanel 
  timeRange={30}
  autoRefresh={true}
  refreshInterval={60}
  className="my-4"
/>
```

#### 功能特性

- 三级预警级别（critical, warning, info）
- 预警摘要统计
- 自动刷新
- 预警关闭功能（待实现）

---

### 4. ExportDialog

数据导出对话框组件。

#### 导入

```tsx
import { ExportDialog } from '@/components/admin/ExportDialog';
```

#### 属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `open` | boolean | 是 | - | 对话框是否打开 |
| `onClose` | () => void | 是 | - | 关闭回调 |
| `exportType` | 'solutions' \| 'users' | 否 | 'solutions' | 导出类型 |

#### 使用示例

```tsx
const [exportOpen, setExportOpen] = useState(false);

<ExportDialog
  open={exportOpen}
  onClose={() => setExportOpen(false)}
  exportType="solutions"
/>
```

#### 功能特性

- 支持多种导出格式（JSON, CSV, Excel）
- 数据筛选选项
- 日期范围选择
- 加载状态显示

---

### 5. VirtualizedActivityFeed

虚拟滚动活动流组件，适用于大量活动数据。

#### 导入

```tsx
import { VirtualizedActivityFeed } from '@/components/admin/VirtualizedActivityFeed';
```

#### 属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `activities` | Activity[] | 是 | - | 活动数据数组 |
| `itemHeight` | number | 否 | 80 | 每个活动项的高度（像素） |
| `overscan` | number | 否 | 5 | 额外渲染的项目数 |
| `className` | string | 否 | '' | 自定义CSS类名 |

#### 使用示例

```tsx
<VirtualizedActivityFeed
  activities={activities}
  itemHeight={80}
  overscan={5}
  className="my-4"
/>
```

#### 功能特性

- 虚拟滚动，只渲染可见区域
- 支持大量数据（1000+项）
- 平滑滚动体验
- 自定义项目高度

---

## 工具Hooks

### useDebounce

防抖Hook，用于优化频繁触发的操作。

#### 导入

```tsx
import { useDebounce } from '@/lib/hooks/useDebounce';
```

#### 使用示例

```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300);

useEffect(() => {
  // 使用debouncedSearchTerm进行搜索
  performSearch(debouncedSearchTerm);
}, [debouncedSearchTerm]);
```

### useThrottle

节流Hook，用于限制函数执行频率。

#### 导入

```tsx
import { useThrottle } from '@/lib/hooks/useThrottle';
```

#### 使用示例

```tsx
const [scrollPosition, setScrollPosition] = useState(0);
const throttledScrollPosition = useThrottle(scrollPosition, 100);

useEffect(() => {
  // 使用throttledScrollPosition处理滚动
  handleScroll(throttledScrollPosition);
}, [throttledScrollPosition]);
```

---

## 最佳实践

### 1. 性能优化

- 使用`VirtualizedActivityFeed`处理大量数据
- 合理设置`refreshInterval`避免过度刷新
- 使用`Suspense`包装图表组件

### 2. 错误处理

- 所有组件都包含错误状态处理
- 提供重试机制
- 显示友好的错误消息

### 3. 响应式设计

- 所有组件都支持响应式布局
- 使用Tailwind CSS类名进行样式定制

### 4. 可访问性

- 使用语义化HTML
- 提供适当的ARIA标签
- 支持键盘导航

---

## 样式定制

所有组件都支持通过`className`属性添加自定义样式：

```tsx
<DashboardCharts className="custom-charts-container" />
<ActivityFeed className="custom-activity-feed" />
```

使用Tailwind CSS进行样式定制：

```tsx
<AlertPanel className="rounded-lg shadow-lg border-2" />
```

---

## 故障排除

### 图表不显示

1. 检查网络请求是否成功
2. 查看浏览器控制台错误
3. 确认数据格式正确

### 活动流不更新

1. 检查`autoRefresh`是否启用
2. 确认`refreshInterval`设置合理
3. 查看API响应是否正常

### 导出功能失败

1. 检查数据量是否过大
2. 确认浏览器支持文件下载
3. 查看网络请求错误信息

