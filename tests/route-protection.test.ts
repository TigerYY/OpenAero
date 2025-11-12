/**
 * 路由防护规则测试
 * 
 * 测试路由防护系统的各项功能
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(__dirname, '..');

describe('路由防护规则系统', () => {
  describe('文件存在性检查', () => {
    it('应该存在 ESLint 自定义规则文件', () => {
      const ruleFile = path.join(PROJECT_ROOT, 'eslint-rules/no-hardcoded-routes.js');
      expect(fs.existsSync(ruleFile)).toBe(true);
    });

    it('应该存在 ESLint 自定义配置文件', () => {
      const configFile = path.join(PROJECT_ROOT, '.eslintrc.custom.js');
      expect(fs.existsSync(configFile)).toBe(true);
    });

    it('应该存在路由诊断脚本', () => {
      const diagScript = path.join(PROJECT_ROOT, 'scripts/diagnose-routes.ts');
      expect(fs.existsSync(diagScript)).toBe(true);
    });

    it('应该存在路由修复脚本', () => {
      const fixScript = path.join(PROJECT_ROOT, 'scripts/fix-routes-auto.ts');
      expect(fs.existsSync(fixScript)).toBe(true);
    });

    it('应该存在 CI 检查脚本', () => {
      const ciScript = path.join(PROJECT_ROOT, 'scripts/check-routes-ci.sh');
      expect(fs.existsSync(ciScript)).toBe(true);
    });

    it('应该存在 GitHub Actions 工作流', () => {
      const workflow = path.join(PROJECT_ROOT, '.github/workflows/route-check.yml');
      expect(fs.existsSync(workflow)).toBe(true);
    });

    it('应该存在 pre-commit hook', () => {
      const hook = path.join(PROJECT_ROOT, '.husky/pre-commit');
      expect(fs.existsSync(hook)).toBe(true);
    });

    it('应该存在防护规则文档', () => {
      const guide = path.join(PROJECT_ROOT, 'ROUTE_PROTECTION_GUIDE.md');
      expect(fs.existsSync(guide)).toBe(true);
    });
  });

  describe('脚本可执行性检查', () => {
    it('CI 检查脚本应该可执行', () => {
      const ciScript = path.join(PROJECT_ROOT, 'scripts/check-routes-ci.sh');
      const stats = fs.statSync(ciScript);
      // 检查是否有执行权限 (owner)
      expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
    });

    it('pre-commit hook 应该可执行', () => {
      const hook = path.join(PROJECT_ROOT, '.husky/pre-commit');
      const stats = fs.statSync(hook);
      // 检查是否有执行权限 (owner)
      expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy();
    });
  });

  describe('package.json 脚本检查', () => {
    let packageJson: any;

    beforeAll(() => {
      const pkgPath = path.join(PROJECT_ROOT, 'package.json');
      packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    });

    it('应该包含 check:routes 脚本', () => {
      expect(packageJson.scripts['check:routes']).toBeDefined();
    });

    it('应该包含 fix:routes 脚本', () => {
      expect(packageJson.scripts['fix:routes']).toBeDefined();
    });

    it('应该包含 check:routes:ci 脚本', () => {
      expect(packageJson.scripts['check:routes:ci']).toBeDefined();
    });

    it('应该包含 lint:routes 脚本', () => {
      expect(packageJson.scripts['lint:routes']).toBeDefined();
    });
  });

  describe('GitHub Actions 工作流配置检查', () => {
    let workflow: string;

    beforeAll(() => {
      const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/route-check.yml');
      workflow = fs.readFileSync(workflowPath, 'utf-8');
    });

    it('应该在 PR 时触发', () => {
      expect(workflow).toContain('pull_request');
    });

    it('应该检查路由文件变更', () => {
      expect(workflow).toContain('src/**/*.tsx');
      expect(workflow).toContain('src/**/*.ts');
    });

    it('应该运行路由诊断', () => {
      expect(workflow).toContain('diagnose-routes.ts');
    });

    it('应该上传诊断报告', () => {
      expect(workflow).toContain('upload-artifact');
      expect(workflow).toContain('route-diagnosis-report');
    });

    it('应该在失败时评论 PR', () => {
      expect(workflow).toContain('github-script');
      expect(workflow).toContain('createComment');
    });
  });

  describe('ESLint 规则配置检查', () => {
    let eslintConfig: string;

    beforeAll(() => {
      const configPath = path.join(PROJECT_ROOT, '.eslintrc.custom.js');
      eslintConfig = fs.readFileSync(configPath, 'utf-8');
    });

    it('应该包含 no-hardcoded-routes 规则', () => {
      expect(eslintConfig).toContain('no-hardcoded-routes');
    });

    it('应该配置允许的路径模式', () => {
      expect(eslintConfig).toContain('allowedPatterns');
      expect(eslintConfig).toContain('^https?://');
      expect(eslintConfig).toContain('^mailto:');
      expect(eslintConfig).toContain('^tel:');
    });

    it('应该启用导入检查', () => {
      expect(eslintConfig).toContain('checkImports');
    });
  });

  describe('路由诊断功能测试', () => {
    it('诊断脚本应该能正常运行', () => {
      try {
        execSync('npx tsx scripts/diagnose-routes.ts', {
          cwd: PROJECT_ROOT,
          stdio: 'pipe',
          timeout: 30000
        });
      } catch (error: any) {
        // 即使发现问题,脚本也应该成功运行 (退出码0)
        fail(`诊断脚本执行失败: ${error.message}`);
      }
    });

    it('应该生成诊断报告文件', () => {
      const reportPath = path.join(PROJECT_ROOT, 'route-diagnosis-report.json');
      
      // 运行诊断
      execSync('npx tsx scripts/diagnose-routes.ts', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });

      expect(fs.existsSync(reportPath)).toBe(true);
    });

    it('诊断报告应该包含必要字段', () => {
      const reportPath = path.join(PROJECT_ROOT, 'route-diagnosis-report.json');
      
      // 运行诊断
      execSync('npx tsx scripts/diagnose-routes.ts', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('totalIssues');
      expect(report.summary).toHaveProperty('affectedFiles');
      expect(report.summary).toHaveProperty('issuesByType');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('fileStructure');
    });

    it('当前项目应该没有路由问题', () => {
      const reportPath = path.join(PROJECT_ROOT, 'route-diagnosis-report.json');
      
      // 运行诊断
      execSync('npx tsx scripts/diagnose-routes.ts', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe'
      });

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      
      expect(report.summary.totalIssues).toBe(0);
    });
  });

  describe('文档完整性检查', () => {
    it('防护指南应该包含所有必要部分', () => {
      const guidePath = path.join(PROJECT_ROOT, 'ROUTE_PROTECTION_GUIDE.md');
      const guide = fs.readFileSync(guidePath, 'utf-8');

      expect(guide).toContain('ESLint 自定义规则');
      expect(guide).toContain('路由诊断脚本');
      expect(guide).toContain('自动修复脚本');
      expect(guide).toContain('CI 检查脚本');
      expect(guide).toContain('GitHub Actions');
      expect(guide).toContain('Pre-commit Hook');
      expect(guide).toContain('使用指南');
      expect(guide).toContain('错误示例');
      expect(guide).toContain('故障排查');
    });

    it('应该存在快速参考文档', () => {
      const summaryPath = path.join(PROJECT_ROOT, 'ROUTE_PROTECTION_SUMMARY.md');
      expect(fs.existsSync(summaryPath)).toBe(true);
    });

    it('应该存在 PR 模板', () => {
      const templatePath = path.join(PROJECT_ROOT, '.github/PULL_REQUEST_TEMPLATE.md');
      expect(fs.existsSync(templatePath)).toBe(true);
      
      const template = fs.readFileSync(templatePath, 'utf-8');
      expect(template).toContain('路由规范检查');
    });
  });
});

describe('ESLint 自定义规则逻辑测试', () => {
  // 注: 这些是单元测试,实际使用时需要 ESLint 测试工具
  // 这里仅验证规则文件的基本结构

  it('规则文件应该导出正确的结构', () => {
    const rulePath = path.join(PROJECT_ROOT, 'eslint-rules/no-hardcoded-routes.js');
    const rule = require(rulePath);

    expect(rule).toHaveProperty('meta');
    expect(rule).toHaveProperty('create');
    expect(typeof rule.create).toBe('function');
  });

  it('规则元数据应该包含必要信息', () => {
    const rulePath = path.join(PROJECT_ROOT, 'eslint-rules/no-hardcoded-routes.js');
    const rule = require(rulePath);

    expect(rule.meta).toHaveProperty('type');
    expect(rule.meta).toHaveProperty('docs');
    expect(rule.meta).toHaveProperty('messages');
    expect(rule.meta).toHaveProperty('fixable');
    expect(rule.meta).toHaveProperty('schema');
  });

  it('规则应该定义所有错误消息', () => {
    const rulePath = path.join(PROJECT_ROOT, 'eslint-rules/no-hardcoded-routes.js');
    const rule = require(rulePath);

    const messages = rule.meta.messages;
    expect(messages).toHaveProperty('hardcodedHref');
    expect(messages).toHaveProperty('hardcodedPush');
    expect(messages).toHaveProperty('hardcodedReplace');
    expect(messages).toHaveProperty('hardcodedRedirect');
    expect(messages).toHaveProperty('missingRouting');
  });
});
