# Auth Cleanup

## ADDED Requirements

### Requirement: Optimize Database Schema
系统SHALL移除冗余的认证相关数据库对象。

#### Scenario: Database schema is optimized
- **WHEN** 迁移到Supabase Auth完成且清理脚本被执行
- **THEN** 系统SHALL移除或归档自定义users表
- **AND** 系统SHALL删除冗余认证索引
- **AND** 系统SHALL优化数据库大小
- **AND** 系统SHALL改善性能
- **验证**: 数据库优化成功，性能提升

### Requirement: Update Documentation
系统SHALL确保所有文档反映新的认证系统。

#### Scenario: Documentation is updated
- **WHEN** 认证系统已更改且文档审查被执行
- **THEN** 系统SHALL更新API文档以引用Supabase Auth
- **AND** 系统SHALL更新开发指南
- **AND** 系统SHALL更新部署程序以反映新系统
- **AND** 系统SHALL更新故障排除指南
- **验证**: 文档最新且准确

## MODIFIED Requirements

### Requirement: Update Test Suite
系统SHALL修改测试以使用Supabase认证。

#### Scenario: Authentication tests are updated
- **WHEN** 测试套件重构且测试使用自定义认证
- **THEN** 系统SHALL更新测试以使用Supabase Auth Provider
- **AND** 系统SHALL为单元测试模拟Supabase客户端
- **AND** 系统SHALL使集成测试使用真实Supabase
- **AND** 系统SHALL维护或改善测试覆盖率
- **验证**: 测试套件更新，覆盖率保持

### Requirement: Update Environment Configuration
系统SHALL清理环境变量和配置。

#### Scenario: Environment is cleaned up
- **WHEN** 迁移完成且配置被审查
- **THEN** 系统SHALL移除冗余认证环境变量
- **AND** 系统SHALL优化Supabase配置
- **AND** 系统SHALL设置适当的默认值
- **AND** 系统SHALL更新文档
- **验证**: 环境配置清理，优化正确

## REMOVED Requirements

### Requirement: Remove Custom Authentication Components
系统SHALL消除所有自定义认证相关代码。

#### Scenario: Custom auth components are removed
- **WHEN** 清理被执行且自定义认证存在
- **THEN** 系统SHALL删除AuthClient类
- **AND** 系统SHALL移除自定义认证API路由
- **AND** 系统SHALL替换认证中间件
- **AND** 系统SHALL删除遗留认证组件
- **验证**: 自定义认证代码完全移除

#### Scenario: Unused dependencies are removed
- **WHEN** 依赖清理被执行且认证相关包未使用
- **THEN** 系统SHALL卸载未使用的认证包
- **AND** 系统SHALL更新package.json
- **AND** 系统SHALL清理node_modules
- **AND** 系统SHALL优化包大小
- **验证**: 依赖清理完成，包大小优化

### Requirement: Remove Feature Flags
系统SHALL在迁移完成后消除认证功能标志。

#### Scenario: Feature flags are removed
- **WHEN** 迁移验证完成且清理被执行
- **THEN** 系统SHALL移除认证系统功能标志
- **AND** 系统SHALL简化相关条件逻辑
- **AND** 系统SHALL减少代码复杂性
- **AND** 系统SHALL简化配置
- **验证**: 功能标志移除，代码简化

### Requirement: Remove Migration Scripts
系统SHALL清理临时迁移相关代码。

#### Scenario: Migration scripts are removed
- **WHEN** 迁移完成并验证且清理被执行
- **THEN** 系统SHALL归档迁移脚本
- **AND** 系统SHALL删除临时数据库表
- **AND** 系统SHALL归档回滚脚本
- **AND** 系统SHALL记录清理日志
- **验证**: 迁移代码清理，日志完整

## Dependencies

- **Prerequisites**: 认证API替换完成并验证
- **Related Capabilities**: 
  - [auth-api-replacement](../auth-api-replacement/spec.md)
  - [supabase-auth-setup](../supabase-auth-setup/spec.md)
- **Blocking**: 无（最终阶段）

## Acceptance Criteria

1. 所有自定义认证代码被移除
2. 数据库模式为Supabase Auth优化
3. 测试套件更新并通过
4. 文档最新且准确
5. 未使用依赖被移除
6. 功能标志被消除
7. 包大小优化
8. 性能保持或改善
9. 不丢失认证功能
10. 系统准备好使用Supabase Auth进行生产