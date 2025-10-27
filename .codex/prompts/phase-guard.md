---
description: 开发阶段守护提示 - 确保AI助理严格遵循开发阶段顺序
priority: CRITICAL
---

# 🚨 开发阶段守护提示

**在开始任何开发任务前，AI助理必须执行以下检查：**

## 1. 阶段状态检查
```bash
# 必须首先查看开发阶段锁定文件
cat /Users/yangyang/Library/Mobile Documents/com~apple~CloudDocs/YYicode/OpenAero/openaero.web/DEVELOPMENT_PHASES.md
```

## 2. 当前阶段确认
- 确认当前正在进行的阶段
- 检查该阶段的完成状态
- 验证前置条件是否满足

## 3. 任务合规性检查
在执行任何开发任务前，必须确认：
- [ ] 任务属于当前允许的阶段
- [ ] 不会跳过或打乱既定的阶段顺序
- [ ] 如果是新阶段，前置条件已满足

## 4. 禁止行为
- ❌ 跳过阶段 (除非是并行允许的 Phase 8/9)
- ❌ 打乱顺序
- ❌ 在未完成前置条件时开始新阶段
- ❌ 忽略 DEVELOPMENT_PHASES.md 文件

## 5. 强制流程
每次开发会话开始时：
1. 读取 `DEVELOPMENT_PHASES.md`
2. 确认当前阶段状态
3. 向用户报告当前进度
4. 获得用户确认后再开始开发

## 6. 状态更新义务
完成任何阶段或重要里程碑后：
- 必须更新 `DEVELOPMENT_PHASES.md` 文件
- 更新任务状态 (❌ 未开始 → 🔄 进行中 → ✅ 已完成)
- 记录完成时间和关键成果

---

**此提示的优先级为 CRITICAL，任何AI助理都不得忽略或绕过这些检查。**