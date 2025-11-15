# API 路由实现总结

## 实现时间
2025-01-XX

## 已实现的 API 路由

### ✅ 1. 方案创建和更新

#### `POST /api/solutions` - 创建方案
- **状态**: ✅ 已更新
- **功能**: 
  - 验证用户为 CREATOR 角色
  - 获取创作者档案
  - 创建方案草稿（DRAFT 状态）
  - 设置 creatorId
  - 支持新字段（technicalSpecs, locale）
- **文件**: `src/app/api/solutions/route.ts`

#### `PUT /api/solutions/[id]` - 更新方案
- **状态**: ✅ 已增强
- **功能**:
  - 验证用户为 CREATOR 且为方案所有者
  - 验证方案状态允许编辑（DRAFT 或 REJECTED）
  - 更新方案信息
  - 返回完整方案数据（包含 creator, assets, bomItems）
- **文件**: `src/app/api/solutions/[id]/route.ts`

#### `GET /api/solutions/[id]` - 获取方案详情
- **状态**: ✅ 已增强
- **功能**:
  - 公共访问时仅允许访问 PUBLISHED 方案
  - CREATOR 可访问自己创建的所有方案
  - ADMIN/REVIEWER 可访问所有方案
  - 包含 SolutionAsset 信息
  - 包含 SolutionBomItem 信息（优先，fallback 到 JSON）
  - 包含审核历史（fromStatus/toStatus）
- **文件**: `src/app/api/solutions/[id]/route.ts`

### ✅ 2. 方案提交和审核

#### `POST /api/solutions/[id]/submit` - 提交审核
- **状态**: ✅ 已增强
- **功能**:
  - 验证用户为 CREATOR 角色
  - 验证方案状态为 DRAFT 或 REJECTED
  - 验证必填字段完整性
  - 验证至少一个 asset
  - 更新状态为 PENDING_REVIEW
  - 设置 submittedAt 时间戳
  - **新增**: 创建 SolutionReview 记录（fromStatus → toStatus）
  - 记录审计日志
- **文件**: `src/app/api/solutions/[id]/submit/route.ts`

### ✅ 3. BOM 管理

#### `PUT /api/solutions/[id]/bom` - 更新 BOM 清单
- **状态**: ✅ 新建
- **功能**:
  - 验证用户为 CREATOR 且为方案所有者
  - 验证方案状态允许编辑
  - 删除现有 BOM 项
  - 批量创建新 BOM 项
  - 验证 productId 引用（如果提供）
  - 使用事务确保数据一致性
- **文件**: `src/app/api/solutions/[id]/bom/route.ts`

#### `GET /api/solutions/[id]/bom` - 获取 BOM 清单
- **状态**: ✅ 新建
- **功能**:
  - 权限控制（PUBLISHED 方案公共可访问）
  - 包含 Product 关联信息
  - 返回格式化的 BOM 项列表
- **文件**: `src/app/api/solutions/[id]/bom/route.ts`

### ✅ 4. 资产管理

#### `POST /api/solutions/[id]/assets` - 添加资产
- **状态**: ✅ 新建
- **功能**:
  - 验证用户为 CREATOR 且为方案所有者
  - 验证方案状态允许编辑
  - 接收资产元数据（type, url, title, description）
  - 批量创建 SolutionAsset 记录
  - 支持 AssetType 枚举（IMAGE, DOCUMENT, VIDEO, CAD, OTHER）
- **文件**: `src/app/api/solutions/[id]/assets/route.ts`

#### `GET /api/solutions/[id]/assets` - 获取资产列表
- **状态**: ✅ 新建
- **功能**:
  - 权限控制（PUBLISHED 方案公共可访问）
  - 支持按类型筛选
  - 返回格式化的资产列表
- **文件**: `src/app/api/solutions/[id]/assets/route.ts`

#### `DELETE /api/solutions/[id]/assets` - 删除资产
- **状态**: ✅ 新建
- **功能**:
  - 验证用户为 CREATOR 且为方案所有者
  - 验证方案状态允许编辑
  - 删除指定资产
- **文件**: `src/app/api/solutions/[id]/assets/route.ts`

### ✅ 5. 创作者方案列表

#### `GET /api/solutions/mine` - 获取我的方案列表
- **状态**: ✅ 新建
- **功能**:
  - 验证用户为 CREATOR 角色
  - 查询当前用户创建的所有方案
  - 支持状态筛选
  - 支持分页
  - 包含资产预览、BOM 项数量等统计信息
- **文件**: `src/app/api/solutions/mine/route.ts`

### ✅ 6. 方案发布

#### `POST /api/solutions/[id]/publish` - 发布/下架方案
- **状态**: ✅ 新建
- **功能**:
  - 验证用户为 ADMIN 角色
  - 支持 action=PUBLISH 和 action=ARCHIVE
  - PUBLISH: 验证状态为 APPROVED，更新为 PUBLISHED，设置 publishedAt
  - ARCHIVE: 验证状态为 PUBLISHED，更新为 ARCHIVED，设置 archivedAt
  - 创建 SolutionReview 记录记录状态转换
  - 记录审计日志
- **文件**: `src/app/api/solutions/[id]/publish/route.ts`

## API 响应格式

所有 API 都使用统一的响应格式：
- **成功**: `createSuccessResponse(data, message, status)`
- **错误**: `createErrorResponse(error, status, details)`
- **验证错误**: `createValidationErrorResponse(zodError)`
- **分页**: `createPaginatedResponse(items, page, limit, total, message)`

## 权限控制

### CREATOR 权限
- 创建方案
- 编辑自己的方案（DRAFT/REJECTED 状态）
- 提交自己的方案审核
- 管理自己方案的 BOM 和资产
- 查看自己的方案列表

### ADMIN/SUPER_ADMIN 权限
- 所有 CREATOR 权限
- 发布/下架方案
- 访问所有方案

### PUBLIC 权限
- 查看 PUBLISHED 状态的方案
- 查看 PUBLISHED 方案的 BOM 和资产

## 数据验证

- 使用 Zod schema 进行输入验证
- 状态转换验证（确保状态机规则）
- 权限验证（角色和所有权）
- 必填字段验证
- 关联数据验证（如 productId）

## 审计日志

所有关键操作都记录审计日志：
- SOLUTION_CREATED
- SOLUTION_UPDATED
- SOLUTION_SUBMITTED
- SOLUTION_BOM_UPDATED
- SOLUTION_ASSETS_ADDED
- SOLUTION_ASSET_DELETED
- SOLUTION_PUBLISHED
- SOLUTION_ARCHIVED

## 下一步

1. ✅ API 路由实现完成
2. ⏳ 实现前端页面
3. ⏳ 增强审核 API（添加 fromStatus/toStatus）
4. ⏳ 测试和优化

## 注意事项

- 使用了类型断言 `as any` 来处理 Prisma Client 类型问题（待 Prisma Client 完全更新后移除）
- 所有 API 都使用事务确保数据一致性
- 权限验证在多个层级进行（角色、所有权、状态）

