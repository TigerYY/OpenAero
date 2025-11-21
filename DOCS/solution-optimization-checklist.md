# 解决方案优化实施检查清单

## 快速概览

### 核心优化点

1. ✅ **上架/下架流程优化**
   - 新增 `READY_TO_PUBLISH` 状态（准备发布）
   - 新增 `SUSPENDED` 状态（临时下架）
   - 支持批量上架/下架

2. ✅ **上架优化功能**
   - 上架说明 (`publish_description`)
   - 媒体链接 (`media_links`)
   - 商品链接 (`product_links`)
   - SEO 优化字段

3. ✅ **状态管理完善**
   - 完整的状态流转图
   - 状态转换权限控制
   - 状态查询优化

4. ✅ **方案升级功能**
   - 升级方案 API
   - 升级选项（资产、BOM、文件）
   - 升级历史追踪

---

## 数据库变更清单

### 1. SolutionStatus 枚举更新

```prisma
enum SolutionStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  READY_TO_PUBLISH  // 新增
  PUBLISHED
  REJECTED
  ARCHIVED
  SUSPENDED         // 新增
  NEEDS_REVISION    // 如果还没有，需要添加
}
```

### 2. Solution 模型字段添加

```prisma
// 上架优化字段
publish_description    String?   @map("publish_description")
media_links           Json?     @map("media_links")
product_links         Json?     @map("product_links")
meta_title            String?   @map("meta_title")
meta_description      String?   @map("meta_description")
meta_keywords         String[]  @map("meta_keywords")
featured_tags         String[]  @map("featured_tags")
featured_order        Int?      @map("featured_order")
is_featured           Boolean   @default(false) @map("is_featured")
view_count            Int       @default(0) @map("view_count")
download_count        Int       @default(0) @map("download_count")
like_count            Int       @default(0) @map("like_count")
optimized_at          DateTime? @map("optimized_at")
optimized_by          String?   @map("optimized_by")

// 升级相关字段
upgraded_from_id        String?   @map("upgraded_from_id")
upgraded_from_version   Int?      @map("upgraded_from_version")
upgrade_notes           String?   @map("upgrade_notes")
is_upgrade              Boolean   @default(false) @map("is_upgrade")
```

---

## API 端点清单

### 新增 API

- [ ] `PUT /api/admin/solutions/[id]/optimize` - 上架优化
- [ ] `GET /api/admin/solutions/[id]/preview` - 预览发布效果
- [ ] `POST /api/admin/solutions/batch-publish` - 批量发布
- [ ] `POST /api/admin/solutions/batch-suspend` - 批量下架
- [ ] `POST /api/admin/solutions/batch-restore` - 批量恢复
- [ ] `POST /api/solutions/[id]/upgrade` - 升级方案
- [ ] `GET /api/solutions/[id]/upgrade-history` - 获取升级历史

### 更新 API

- [ ] `POST /api/solutions/[id]/publish` - 支持 `READY_TO_PUBLISH` → `PUBLISHED`
- [ ] `POST /api/solutions/[id]/publish` - 支持 `PUBLISHED` → `SUSPENDED`
- [ ] `POST /api/solutions/[id]/publish` - 支持 `SUSPENDED` → `PUBLISHED`
- [ ] `GET /api/admin/solutions` - 支持新状态筛选
- [ ] `GET /api/solutions/mine` - 支持新状态筛选

---

## 前端页面清单

### 新增页面

- [ ] `/zh-CN/admin/solutions/[id]/optimize` - 上架优化页面
- [ ] `/zh-CN/admin/solutions/publish-management` - 发布管理页面
- [ ] `/zh-CN/creators/solutions/[id]/upgrade` - 升级方案页面（可选，也可用对话框）

### 更新页面

- [ ] `/zh-CN/admin/review-workbench` - 增加"准备发布"标签页
- [ ] `/zh-CN/admin/review-workbench` - 更新状态筛选
- [ ] `/zh-CN/creators/dashboard?tab=solutions` - 增加"升级"按钮
- [ ] `/zh-CN/solutions/[id]` - 显示升级关系（如果是升级方案）

---

## 组件清单

### 新增组件

- [ ] `MediaLinkEditor` - 媒体链接编辑器
- [ ] `ProductLinkSelector` - 商品链接选择器
- [ ] `SEOOptimizer` - SEO 优化组件
- [ ] `PublishPreview` - 发布预览组件
- [ ] `UpgradeSolutionDialog` - 升级方案对话框
- [ ] `BatchPublishToolbar` - 批量发布工具栏

### 更新组件

- [ ] `SolutionStatusBadge` - 支持新状态显示
- [ ] `SolutionCard` - 增加升级按钮
- [ ] `ReviewWorkbench` - 增加新标签页

---

## 业务逻辑清单

### 状态转换规则

- [ ] `APPROVED` → `READY_TO_PUBLISH` (管理员优化)
- [ ] `READY_TO_PUBLISH` → `PUBLISHED` (管理员发布)
- [ ] `READY_TO_PUBLISH` → `APPROVED` (管理员退回)
- [ ] `PUBLISHED` → `SUSPENDED` (管理员临时下架)
- [ ] `SUSPENDED` → `PUBLISHED` (管理员恢复)
- [ ] `PUBLISHED` → `ARCHIVED` (管理员永久下架)
- [ ] `ARCHIVED` → `DRAFT` (管理员恢复为草稿)

### 权限验证

- [ ] 上架优化：仅 ADMIN
- [ ] 发布：仅 ADMIN
- [ ] 升级：CREATOR（自己的方案 + 已发布的方案），ADMIN（所有方案）
- [ ] 批量操作：仅 ADMIN

### 数据验证

- [ ] 上架优化：媒体链接格式验证
- [ ] 上架优化：商品链接存在性验证
- [ ] 升级：源方案权限验证
- [ ] 升级：标题唯一性验证

---

## 测试清单

### 单元测试

- [ ] 状态转换函数测试
- [ ] 升级逻辑测试
- [ ] 权限验证测试
- [ ] 数据验证测试

### 集成测试

- [ ] 上架流程端到端测试
- [ ] 下架流程端到端测试
- [ ] 升级流程端到端测试
- [ ] 批量操作测试

### E2E 测试

- [ ] 管理员上架优化流程
- [ ] 管理员批量发布流程
- [ ] 创作者升级方案流程
- [ ] 状态转换流程

---

## 文档更新清单

- [ ] 更新 `solution-complete-lifecycle.md`
- [ ] 更新 API 文档
- [ ] 创建用户手册（管理员）
- [ ] 创建用户手册（创作者）
- [ ] 更新数据库 schema 文档

---

## 部署清单

### 数据库迁移

- [ ] 创建迁移脚本
- [ ] 测试迁移脚本（开发环境）
- [ ] 备份生产数据库
- [ ] 执行迁移（生产环境）
- [ ] 验证迁移结果

### 代码部署

- [ ] 更新依赖包
- [ ] 构建前端
- [ ] 部署后端 API
- [ ] 部署前端页面
- [ ] 验证部署

### 回滚准备

- [ ] 准备数据库回滚脚本
- [ ] 准备代码回滚版本
- [ ] 测试回滚流程

---

## 监控清单

### 指标监控

- [ ] 状态转换成功率
- [ ] 上架优化完成时间
- [ ] 升级方案数量
- [ ] 批量操作性能

### 错误监控

- [ ] 状态转换错误
- [ ] 升级失败错误
- [ ] 批量操作错误

---

## 优先级建议

### 高优先级（P0）

1. ✅ 数据库迁移（新增状态和字段）
2. ✅ 上架优化 API
3. ✅ 发布管理页面
4. ✅ 状态转换逻辑

### 中优先级（P1）

1. ✅ 升级方案功能
2. ✅ 批量操作功能
3. ✅ 预览功能

### 低优先级（P2）

1. ✅ 升级历史追踪
2. ✅ SEO 优化功能
3. ✅ 数据分析功能

---

**最后更新**: 2025-01-31

