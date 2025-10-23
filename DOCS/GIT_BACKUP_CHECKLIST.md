# Git 备份清单

目的

- 为仓库提供可重复、可验证、可恢复的备份流程。
- 最小化因误删、仓库损坏或远程服务中断造成的数据/历史丢失风险。

适用范围

- 代码历史（commit、branch、tag）
- Git LFS 对象（如使用）
- 子模块（submodules）
- CI/CD 配置（如 `.github/workflows`）
- 仓库配置与钩子（`.git/hooks`、`.gitattributes`、`.gitignore`）
- Release notes、标签、资产（release attachments）
- 重要部署或运行时配置的导出（例如数据库导出、上传文件）的外部备份（不建议将 secrets 存入仓库）

备份清单（要备份的项）

1. 完整仓库镜像（含所有 refs: branches + tags）
2. LFS 对象（如果使用 git-lfs）
3. Submodule 引用与子仓库
4. 本地 hooks（如有特殊钩子逻辑）
5. CI/CD 配置与其他 infra 配置文件（`.github`, `k8s/`, `docker-compose.yml` 等）
6. Release 附件（若使用 GitHub Release）
7. 附加：数据库快照、上传的静态资产（public/ 或外部对象存储）

备份方法与命令（常用）

- 1) 使用 `git clone --mirror` 创建完整镜像（可用于将仓库复制到其他服务器）

```bash
# 在目标备份目录执行：
git clone --mirror https://github.com/OWNER/REPO.git repo.git
# 这样会创建一个裸仓库 repo.git，可通过 rsync/scp 传到备份服务器
```

- 2) 使用 `git bundle` 创建单文件备份（便于离线存档）

```bash
# 创建包含所有 refs 的 bundle
git bundle create repo.bundle --all
# 恢复时：
# git clone repo.bundle repo
# cd repo
# git fetch repo.bundle refs/heads/*:refs/heads/*
```

- 3) 推送到另一个远程（mirror push）

```bash
# 在源仓库（裸仓库或本地克隆）执行：
git remote add backup git@backup.example.com:repos/openaero.git || true
# 推送所有 refs：
git push --mirror backup
```

- 4) 备份 LFS 对象

```bash
# 确保已安装 git-lfs
git lfs fetch --all
# 将 .git/lfs 文件目录或由 lfs 提供的对象复制到备份位置
rsync -a .git/lfs/ /path/to/backup/git-lfs/
```

- 5) 备份子模块

```bash
# 递归获取子模块并打包或同步
git submodule foreach --recursive 'git fetch --all'
# 或单独为每个子模块创建 bundle/镜像
```

- 6) 导出当前代码快照（zip / tar）用于快速还原

```bash
# 以某个 tag 为例
git archive --format=tar.gz -o openaero-v1.2.3.tar.gz v1.2.3
```

校验与验证

- 校验 bundle/镜像是否包含所有 refs：

```bash
# 查看 bundle 的 refs
git bundle list-heads repo.bundle
```

- 恢复式测试（定期）：在隔离环境中恢复镜像或 bundle，确认历史、tags 与主要分支一致并能构建。

自动化建议

- 使用 CI（GitHub Actions / GitLab CI / 服务器 cron）定期创建备份（每日/每周），并将备份上传到安全的位置（S3、ftp、备份服务器）。
- 典型流程：
  - 1) 在 runner/备份脚本中 `git clone --mirror` 或 `git bundle create`。
  - 2) 同步 LFS 对象（如适用）。
  - 3) 将文件上传到对象存储（S3/MinIO）或通过 rsync 到备份主机。
  - 4) 触发恢复验证任务（可选，周期性做 smoke restore）。

示例 GitHub Actions（简化）

```yaml
name: nightly-backup
on:
  schedule:
    - cron: '0 3 * * *' # UTC 每日一次
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout mirror
        run: |
          git clone --mirror https://github.com/${{ github.repository }} repo.git
      - name: Bundle
        run: |
          cd repo.git && git bundle create ../repo-$(date +%F).bundle --all
      - name: Upload to S3
        uses: jakejarvis/s3-sync-action@v0.5.1
        with:
          args: --acl private --follow-symlinks
        env:
          AWS_S3_BUCKET: ${{ secrets.BACKUP_S3_BUCKET }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

安全与合规

- 不要将密钥或 secrets 存入仓库（包括历史）。若发现，应使用 `git filter-repo` 或 `git filter-branch` 安全地清理历史并重新发布。
- 备份存储应启用加密（服务端或客户端加密），并限制访问权限。
- 保留策略（例如：最近 30 天的每日备份 + 最近 12 个月的每月备份 + 最近 5 年的年度备份），并定期清理旧备份。

恢复步骤（典型）

1. 从备份位置下载 `repo.bundle` 或镜像目录。
2. 恢复仓库：

```bash
# 使用 bundle
git clone repo.bundle repo
# 或使用镜像裸仓库
git clone --mirror repo.git repo
cd repo
# 确认 refs
git show-ref
```

3. 如果需要将恢复内容推回到主远程，先在受控环境中验证，然后使用 `git push --mirror origin`（谨慎操作，可能覆盖远程）。

运维提示（实践要点）

- 频率：活跃仓库建议每日备份，较稳定仓库每周即可。
- 测试恢复：至少每月一次实际恢复验证。
- 监控 & 报警：备份失败时通过邮件/Slack 报警。
- 变更日志：记录每次备份的摘要（包含最后的 commit hash、大小、是否包含 LFS）。

附：快速检查脚本（示例，bash）

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_URL="https://github.com/OWNER/REPO.git"
OUTDIR="/backups/openaero/$(date +%F)"
mkdir -p "$OUTDIR"
# 镜像克隆
git clone --mirror "$REPO_URL" "$OUTDIR/repo.git"
# bundle 备份
git --git-dir="$OUTDIR/repo.git" bundle create "$OUTDIR/repo.bundle" --all
# LFS
git --git-dir="$OUTDIR/repo.git" --work-tree="$OUTDIR/tmp" lfs fetch --all || true
# 记录摘要
echo "backup: $(date)" > "$OUTDIR/README.txt"
cd "$OUTDIR/repo.git"
HEAD_HASH=$(git rev-parse --verify refs/heads/main || git rev-parse --verify refs/heads/master || git rev-parse --verify HEAD)
echo "head: $HEAD_HASH" >> "$OUTDIR/README.txt"
```

总结

本清单涵盖了大多数 Git 仓库备份场景：完整历史、LFS、子模块、CI/infra 配置、自动化与恢复验证。根据你机构的合规/保留需求，调整备份频率、加密、与离线副本策略。

如需，我可以：
- 把上面的 GitHub Actions 工作流或 Bash 脚本定制为项目用（填写具体 bucket/路径与 secrets），并提交到仓库；
- 添加恢复演练（在 CI 中）并创建一个定期恢复验证作业。
