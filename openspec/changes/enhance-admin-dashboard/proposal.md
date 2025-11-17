## Why

管理中心仪表板是管理员监控平台运营状态的核心工具。当前实现提供了基础的统计数据和快速操作，但缺少关键功能：
1. 平均审核时间计算未实现（代码中有TODO标记）
2. 缺少数据可视化图表，难以直观理解趋势
3. 缺少实时活动流，无法及时了解平台动态
4. 数据导出功能需要增强（支持更多格式和筛选条件）
5. 缺少关键指标预警和通知机制
6. 缺少详细的数据分析和报表功能

完善这些功能将显著提升管理效率和决策支持能力。

## What Changes

- **ADDED**: 平均审核时间计算功能
- **ADDED**: 数据可视化图表（趋势图、饼图、柱状图）
- **ADDED**: 实时活动流展示
- **ADDED**: 增强的数据导出功能（支持CSV、Excel格式，支持筛选）
- **ADDED**: 关键指标预警和通知机制
- **ADDED**: 详细的数据分析报表（收入分析、用户增长分析、方案质量分析）
- **MODIFIED**: 优化统计API性能（添加缓存、优化查询）
- **MODIFIED**: 改进仪表板UI/UX（响应式布局、加载状态优化）

## Impact

- **Affected specs**: `admin-dashboard` (new capability)
- **Affected code**: 
  - `src/app/[locale]/admin/dashboard/page.tsx`
  - `src/app/api/admin/dashboard/stats/route.ts`
  - `src/app/api/admin/dashboard/quick-actions/route.ts`
  - New: `src/components/admin/DashboardCharts.tsx`
  - New: `src/components/admin/ActivityFeed.tsx`
  - New: `src/lib/admin/export-utils.ts`
  - New: `src/lib/admin/alert-utils.ts`

