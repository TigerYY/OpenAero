# 重构说明文档

## 重构背景

由于当前系统中 Solution 和 Product 数据为空，且前端也未实现相关功能，本次实施采用**全新设计**，避免迁移、合并带来的技术风险。

## 重构决策

### 1. 数据模型重构

**移除的字段**：
- `bom Json?` - 不再使用 JSON 存储，改用 `SolutionBomItem` 关系型表
- `specs Json?` - 不再使用，改用 `technicalSpecs Json?`

**新增的字段**（已完成）：
- `summary String? @db.Text` - 方案摘要
- `tags String[]` - 标签数组
- `locale String @default("zh-CN")` - 语言代码
- `technicalSpecs Json?` - 技术规格（替代 specs）
- `useCases Json?` - 应用场景
- `architecture Json?` - 架构图
- `lastReviewedAt DateTime?` - 最后审核时间
- `publishedAt DateTime?` - 发布时间
- `archivedAt DateTime?` - 归档时间

**新增的模型**（待实现）：
- `SolutionAsset` - 方案资产（图片、文档、视频、CAD）
- `SolutionBomItem` - BOM 清单项（替代 JSON bom 字段）

### 2. 迁移策略

**无需数据迁移**：
- 由于数据为空，无需编写数据迁移脚本
- 无需双写策略（同时写入 JSON 和关系型表）
- 无需回滚方案

**直接实施**：
- 直接使用新的数据模型
- 直接移除旧的 JSON 字段
- 直接实现新的 API 和前端页面

### 3. 实施优势

1. **无历史包袱**：不需要考虑向后兼容性
2. **设计更规范**：直接使用关系型表，支持外键关联
3. **类型安全**：Prisma 提供完整的类型支持
4. **查询优化**：支持索引和外键关联，提升查询性能
5. **开发效率**：无需编写迁移脚本，直接实施新功能

## 下一步行动

1. ✅ 完成 Solution 模型字段扩展（已完成）
2. ⏳ 创建 SolutionAsset 和 SolutionBomItem 模型
3. ⏳ 更新 SolutionReview 模型（添加 fromStatus/toStatus）
4. ⏳ 运行 Prisma 迁移
5. ⏳ 实现新的 API 路由
6. ⏳ 实现前端页面

## 注意事项

- 移除 `bom Json?` 和 `specs Json?` 字段时，需要更新所有引用这些字段的代码
- 新的 API 应该直接使用 `SolutionBomItem` 和 `SolutionAsset`，不再使用 JSON 字段
- 前端表单应该直接操作关系型表，不再解析 JSON 字符串

