## 1. 后端API增强

- [x] 1.1 实现平均审核时间计算逻辑 (`src/app/api/admin/dashboard/stats/route.ts`)
  - 计算所有已完成审核的平均时间
  - 按时间段分组计算（7天、30天、90天）
  - 返回平均审核时间（小时）

- [x] 1.2 添加数据可视化所需的数据端点
  - 创建 `/api/admin/dashboard/charts` 端点
  - 返回趋势数据（方案、用户、收入的时间序列）
  - 返回分类分布数据（饼图数据）
  - 返回状态分布数据（柱状图数据）

- [x] 1.3 增强数据导出功能 (`src/app/api/admin/dashboard/quick-actions/route.ts`)
  - 支持CSV格式导出
  - 支持Excel格式导出（使用xlsx库）
  - 添加更多筛选条件（日期范围、状态、分类等）
  - 优化大数据量导出性能（流式导出）

- [x] 1.4 实现实时活动流API (`src/app/api/admin/dashboard/activities/route.ts`)
  - 返回最近的活动记录（用户注册、方案提交、审核完成等）
  - 支持分页和筛选
  - 支持实时更新（可选：WebSocket或轮询）

- [x] 1.5 添加预警和通知API (`src/app/api/admin/dashboard/alerts/route.ts`)
  - 检测关键指标异常（待审核方案积压、用户增长下降等）
  - 返回预警列表
  - 支持预警规则配置

## 2. 前端组件开发

- [x] 2.1 创建图表组件库 (`src/components/admin/DashboardCharts.tsx`)
  - 趋势折线图（使用recharts或chart.js）
  - 分类饼图
  - 状态柱状图
  - 收入趋势图

- [x] 2.2 创建活动流组件 (`src/components/admin/ActivityFeed.tsx`)
  - 实时活动列表
  - 活动类型图标和颜色区分
  - 时间格式化显示
  - 支持筛选和搜索

- [x] 2.3 创建预警组件 (`src/components/admin/AlertPanel.tsx`)
  - 预警卡片展示
  - 预警级别颜色区分（警告、严重、信息）
  - 预警操作按钮（标记已读、处理等）

- [x] 2.4 增强导出功能UI (`src/components/admin/ExportDialog.tsx`)
  - 导出格式选择（JSON、CSV、Excel）
  - 筛选条件选择器
  - 导出进度显示

## 3. 仪表板页面优化

- [x] 3.1 重构仪表板布局 (`src/app/[locale]/admin/dashboard/page.tsx`)
  - 添加图表区域
  - 添加活动流区域
  - 添加预警面板
  - 优化响应式布局

- [x] 3.2 实现数据加载状态优化
  - 骨架屏加载
  - 错误状态处理
  - 空状态展示

- [x] 3.3 添加数据刷新机制
  - 自动刷新（可配置间隔）
  - 手动刷新按钮
  - 刷新状态指示

## 4. 工具函数和工具库

- [x] 4.1 创建导出工具 (`src/lib/admin/export-utils.ts`)
  - CSV导出函数
  - Excel导出函数
  - 数据格式化函数

- [x] 4.2 创建预警工具 (`src/lib/admin/alert-utils.ts`)
  - 预警规则定义
  - 预警检测逻辑
  - 预警级别计算

- [x] 4.3 创建图表数据处理工具 (`src/lib/admin/chart-utils.ts`)
  - 数据聚合函数
  - 时间序列数据处理
  - 图表配置生成

## 5. 性能优化

- [x] 5.1 添加API响应缓存
  - 统计数据缓存（5分钟）
  - 图表数据缓存（10分钟）
  - 使用Redis或内存缓存

- [x] 5.2 优化数据库查询
  - 添加必要的索引
  - 优化聚合查询
  - 使用数据库视图（如需要）

- [x] 5.3 前端性能优化
  - 图表数据懒加载
  - 虚拟滚动（活动流）
  - 防抖和节流优化

## 6. 测试和文档

- [x] 6.1 编写单元测试
  - API端点测试
  - 工具函数测试
  - 组件测试

- [x] 6.2 编写集成测试
  - 仪表板完整流程测试
  - 导出功能测试
  - 预警功能测试

- [x] 6.3 更新文档
  - API文档更新
  - 组件使用文档
  - 管理员使用指南

