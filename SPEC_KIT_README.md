# Spec-Kit 使用指南

## 概述
本项目已集成 Spec-Kit（规范驱动开发工具包），用于管理功能规范、技术实施计划和任务清单。

## 目录结构
```
.specify/
├── config.yaml              # Spec-Kit 配置文件
├── feature-template.md      # 功能规范模板
├── plan-template.md         # 技术实施计划模板
└── task-template.md         # 任务清单模板

specs/
└── user-authentication/     # 示例功能规范
    ├── spec.md             # 功能规范文档
    ├── plan.md             # 技术实施计划
    └── tasks.md            # 任务清单
```

## 快速开始

### 1. 检查 Spec-Kit 状态
```bash
npm run spec:check
```

### 2. 查看帮助信息
```bash
npm run spec:help
```

### 3. 列出所有规范
```bash
npm run spec:list
```

## 创建新的功能规范

### 1. 使用命令行创建
```bash
npm run spec:create <功能名称>
```

### 2. 手动创建
1. 在 `specs/` 目录下创建新的功能目录
2. 复制模板文件：
   ```bash
   cp .specify/feature-template.md specs/your-feature/spec.md
   cp .specify/plan-template.md specs/your-feature/plan.md
   cp .specify/task-template.md specs/your-feature/tasks.md
   ```
3. 编辑文件内容，替换模板中的占位符

## 模板说明

### 功能规范模板 (spec.md)
包含以下部分：
- 功能概述和描述
- 业务目标
- 用户故事
- 功能需求 (FR)
- 非功能需求 (NFR)
- 关键实体与关系
- 测试/验收条件
- 风险与未决项
- 依赖关系
- 验收标准

### 技术实施计划模板 (plan.md)
包含以下部分：
- 架构设计
- 技术栈选择
- 模块划分
- 数据流设计
- 组件边界
- 技术选型理由
- 性能优化策略
- 安全考虑
- 监控和日志
- 测试策略
- 部署计划
- 风险评估
- 成功标准

### 任务清单模板 (tasks.md)
包含以下部分：
- 任务概览
- 详细任务列表
- 任务依赖关系
- 资源分配
- 风险控制
- 质量检查点
- 交付物清单

## 工作流程

### 1. 需求分析阶段
- 创建功能规范文档
- 明确业务目标和用户故事
- 定义功能需求和非功能需求

### 2. 技术设计阶段
- 创建技术实施计划
- 设计系统架构
- 选择技术栈和工具

### 3. 任务规划阶段
- 创建任务清单
- 分解开发任务
- 设置任务依赖关系

### 4. 开发实施阶段
- 按照任务清单执行开发
- 定期更新任务状态
- 跟踪进度和质量

### 5. 测试验收阶段
- 执行测试用例
- 进行代码审查
- 用户验收测试

## 最佳实践

### 1. 规范编写
- 使用清晰、具体的语言
- 包含可验证的验收标准
- 考虑边界情况和异常情况
- 定期更新和审查规范

### 2. 计划制定
- 基于规范制定技术方案
- 考虑技术风险和约束
- 制定合理的工期估算
- 预留缓冲时间

### 3. 任务管理
- 任务粒度适中（2-8小时）
- 明确任务依赖关系
- 定期更新任务状态
- 及时识别和解决阻塞

### 4. 质量控制
- 每个阶段设置检查点
- 进行代码审查
- 执行自动化测试
- 收集用户反馈

## 常用命令

```bash
# 检查 Spec-Kit 状态
npm run spec:check

# 查看帮助
npm run spec:help

# 列出规范
npm run spec:list

# 创建新规范
npm run spec:create <功能名称>

# 直接使用 specify 命令
specify check
specify --help
```

## 注意事项

1. **环境要求**: 需要安装 specify 命令（通过 pipx install specify）
2. **文件编码**: 使用 UTF-8 编码保存所有文档
3. **版本控制**: 将规范文档纳入 Git 版本控制
4. **定期更新**: 随着项目进展及时更新规范文档
5. **团队协作**: 确保团队成员都了解规范驱动开发流程

## 示例

参考 `specs/user-authentication/` 目录下的示例文档，了解如何编写完整的功能规范、技术实施计划和任务清单。

## 支持

如有问题或建议，请联系开发团队或查看 Spec-Kit 官方文档。
