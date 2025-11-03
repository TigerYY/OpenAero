# 统一PostgreSQL数据库配置提案

## 变更概述

**变更ID**: `unify-postgresql-databases`  
**优先级**: 高  
**影响范围**: 开发环境、生产环境、数据库配置  
**预计工作量**: 中等 (2-3天)  

## 问题描述

当前项目存在数据库配置不一致的问题：

1. **开发环境**: 使用SQLite数据库，但schema中存在SQLite不支持的Json和Decimal类型
2. **生产环境**: 使用PostgreSQL数据库，与开发环境不一致
3. **配置分散**: 存在多个schema文件（schema.prisma和schema-postgres.prisma）
4. **部署复杂性**: 需要维护两套数据库配置，增加开发和部署难度

## 目标

统一所有环境使用PostgreSQL数据库，实现：

- ✅ 开发环境与生产环境数据库类型一致
- ✅ 消除SQLite兼容性问题
- ✅ 简化数据库配置管理
- ✅ 降低部署复杂性和维护成本
- ✅ 保持数据一致性和迁移路径

## 解决方案

### 核心变更

1. **统一Schema文件**
   - 删除SQLite兼容的schema.prisma
   - 使用PostgreSQL专用的schema-postgres.prisma作为主schema
   - 修复Json和Decimal类型支持

2. **环境配置统一**
   - 开发环境使用本地PostgreSQL实例
   - 测试环境使用Docker PostgreSQL
   - 生产环境使用云PostgreSQL服务

3. **Docker配置优化**
   - 统一开发和生产环境的Docker配置
   - 提供本地开发数据库服务
   - 优化数据库连接和性能配置

### 技术实现

- **数据库**: PostgreSQL 15+ 统一配置
- **ORM**: Prisma 5.8.1+  
- **连接池**: 优化连接参数
- **迁移工具**: Prisma Migrate
- **监控**: PostgreSQL监控集成

## 风险评估

### 低风险
- 开发环境切换：已有PostgreSQL schema文件，可直接使用
- 数据迁移：开发环境数据可重新生成
- 配置变更：环境变量配置调整

### 缓解措施
- 备份现有开发数据
- 分阶段部署验证
- 提供回滚方案

## 成功指标

- [ ] 开发环境成功连接到PostgreSQL
- [ ] 所有数据库操作正常
- [ ] 性能指标符合预期
- [ ] 部署流程简化
- [ ] 开发体验提升

## 相关文档

- [设计文档](./design.md)
- [任务清单](./tasks.md)
- [规格变更](./specs/)

---

**创建时间**: 2025-11-03  
**负责人**: CodeBuddy  
**状态**: 提案阶段