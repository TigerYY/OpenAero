# User Data Migration

## ADDED Requirements

### Requirement: Create User Data Migration Script
系统SHALL开发自动化脚本，将用户数据从自定义users表迁移到Supabase auth.users。

#### Scenario: Migration script processes existing users
- **WHEN** 迁移脚本被执行且users表包含现有用户数据
- **THEN** 脚本SHALL将每个用户迁移到auth.users表
- **AND** 脚本SHALL在user_metadata字段中存储用户元数据
- **AND** 脚本SHALL保留原始用户ID用于回滚目的
- **AND** 脚本SHALL记录所有转换操作
- **验证**: 所有用户成功迁移，数据完整

#### Scenario: Migration handles data conflicts
- **WHEN** 迁移脚本遇到已存在于auth.users表中的邮箱
- **THEN** 脚本SHALL应用适当的冲突解决策略
- **AND** 脚本SHALL通知管理员冲突情况
- **AND** 脚本SHALL继续迁移其他用户
- **验证**: 冲突正确处理，迁移继续进行

### Requirement: Preserve User Metadata
系统SHALL确保所有用户特定信息正确迁移到Supabase元数据。

#### Scenario: User roles are migrated
- **WHEN** 用户在users表中有特定角色（USER、CREATOR、ADMIN）时被迁移到auth.users
- **THEN** 脚本SHALL在user_metadata.role字段中存储角色
- **AND** 脚本SHALL确保基于角色的权限继续工作
- **AND** 脚本SHALL维护角色验证
- **验证**: 用户角色正确迁移，权限正常

#### Scenario: User profile information is migrated
- **WHEN** 用户具有姓名、头像和其他个人资料数据时被迁移
- **THEN** 脚本SHALL在user_metadata中结构化个人资料数据
- **AND** 脚本SHALL正确格式化first_name和last_name
- **AND** 脚本SHALL保留avatar_url（如果可用）
- **验证**: 个人资料数据完整，格式正确

### Requirement: Implement Data Integrity Validation
系统SHALL创建全面验证以确保迁移准确性。

#### Scenario: Migration validation is performed
- **WHEN** 验证脚本在迁移脚本完成后执行
- **THEN** 脚本SHALL验证源表中的所有用户都存在于目标中
- **AND** 脚本SHALL确保邮箱地址完全匹配
- **AND** 脚本SHALL确认用户元数据完整准确
- **AND** 脚本SHALL检测不到数据损坏
- **验证**: 数据完整性验证通过100%

#### Scenario: Rollback capability is tested
- **WHEN** 需要回滚迁移且回滚脚本被执行
- **THEN** 脚本SHALL恢复原始users表
- **AND** 脚本SHALL清理auth.users条目
- **AND** 脚本SHALL确保回滚期间不发生数据丢失
- **验证**: 回滚功能正常，无数据丢失

### Requirement: Create Migration Backup Strategy
系统SHALL在迁移执行前实施全面备份。

#### Scenario: Backup is created before migration
- **WHEN** 迁移即将开始且备份脚本被执行
- **THEN** 脚本SHALL备份完整的users表
- **AND** 脚本SHALL备份数据库模式
- **AND** 脚本SHALL验证备份完整性
- **AND** 脚本SHALL安全存储备份
- **验证**: 备份成功创建，可验证

## MODIFIED Requirements

### Requirement: Update Database Schema
系统SHALL修改数据库模式以支持Supabase Auth集成。

#### Scenario: Database schema is updated for migration
- **WHEN** 模式更新被应用且迁移已计划
- **THEN** 系统SHALL使auth.users表可用
- **AND** 系统SHALL在过渡期间保留自定义users表
- **AND** 系统SHALL维护外键关系
- **AND** 系统SHALL为新认证系统优化索引
- **验证**: 数据库模式更新正确，关系完整

## REMOVED Requirements

None for this capability.

## Dependencies

- **Prerequisites**: Supabase Auth已启用，备份策略已批准
- **Related Capabilities**: 
  - [supabase-auth-setup](../supabase-auth-setup/spec.md)
  - [auth-api-replacement](../auth-api-replacement/spec.md)
- **Blocking**: 在迁移完成之前无法进行API替换

## Acceptance Criteria

1. 迁移脚本处理所有用户且无错误
2. 用户元数据准确保留和结构化
3. 数据完整性验证通过100%
4. 回滚功能经过测试且功能正常
5. 备份策略已实施并验证
6. 迁移日志全面且可审计
7. 迁移期间不丢失或损坏用户数据
8. 迁移过程期间性能影响最小