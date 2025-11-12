/**
 * ESLint自定义规则: 禁止硬编码路由
 * 
 * 检测并禁止在代码中使用硬编码的路由路径,强制使用 useRouting hook
 * 
 * ❌ 错误示例:
 * - <Link href="/login">
 * - router.push("/profile")
 * - redirect("/home")
 * 
 * ✅ 正确示例:
 * - <Link href={route(routes.AUTH.LOGIN)}>
 * - router.push(route("/profile"))
 * - redirect(route("/home"))
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止使用硬编码的路由路径,必须使用 useRouting hook',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      hardcodedHref: '禁止使用硬编码的 href="/{{path}}", 请使用 route() 函数包装: href={route("{{path}}")}',
      hardcodedPush: '禁止使用硬编码的 router.push("/{{path}}"), 请使用: router.push(route("/{{path}}"))',
      hardcodedReplace: '禁止使用硬编码的 router.replace("/{{path}}"), 请使用: router.replace(route("/{{path}}"))',
      hardcodedRedirect: '禁止使用硬编码的 redirect("/{{path}}"), 请使用: redirect(route("/{{path}}"))',
      missingRouting: '使用了路由功能但未导入 useRouting hook, 请添加: import { useRouting } from "@/lib/routing"',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          // 允许的路径模式(正则表达式字符串数组)
          allowedPatterns: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: [
              '^https?://', // 允许外部链接
              '^mailto:', // 允许邮件链接
              '^tel:', // 允许电话链接
              '^#', // 允许锚点链接
            ]
          },
          // 是否检查组件导入
          checkImports: {
            type: 'boolean',
            default: true
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = options.allowedPatterns || [
      '^https?://',
      '^mailto:',
      '^tel:',
      '^#',
    ];
    const checkImports = options.checkImports !== false;

    // 编译正则表达式
    const allowedRegexes = allowedPatterns.map(pattern => new RegExp(pattern));

    // 检查路径是否被允许
    function isAllowedPath(path) {
      return allowedRegexes.some(regex => regex.test(path));
    }

    // 提取字符串字面量值
    function getStringValue(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
      }
      if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
        return node.quasis[0].value.cooked;
      }
      return null;
    }

    // 检查是否导入了 useRouting
    let hasRoutingImport = false;
    let hasRouteUsage = false;

    return {
      // 检查导入语句
      ImportDeclaration(node) {
        if (checkImports && node.source.value === '@/lib/routing') {
          const hasUseRouting = node.specifiers.some(
            spec => spec.imported && spec.imported.name === 'useRouting'
          );
          if (hasUseRouting) {
            hasRoutingImport = true;
          }
        }
      },

      // 检查 JSX href 属性
      JSXAttribute(node) {
        if (node.name.name !== 'href') return;

        const value = node.value;
        if (!value) return;

        // 检查字符串字面量: href="/path"
        if (value.type === 'Literal') {
          const path = value.value;
          if (typeof path === 'string' && path.startsWith('/') && !isAllowedPath(path)) {
            hasRouteUsage = true;
            context.report({
              node: value,
              messageId: 'hardcodedHref',
              data: { path },
              fix(fixer) {
                return fixer.replaceText(value, `{route("${path}")}`);
              }
            });
          }
        }

        // 检查模板字符串: href={`/path`}
        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (expr.type === 'TemplateLiteral' && expr.quasis.length === 1) {
            const path = expr.quasis[0].value.cooked;
            if (path && path.startsWith('/') && !isAllowedPath(path)) {
              hasRouteUsage = true;
              context.report({
                node: expr,
                messageId: 'hardcodedHref',
                data: { path },
                fix(fixer) {
                  return fixer.replaceText(expr, `route("${path}")`);
                }
              });
            }
          }
        }
      },

      // 检查 router.push() 和 router.replace()
      CallExpression(node) {
        // 检查 router.push("/path") 或 router.replace("/path")
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'router' &&
          (node.callee.property.name === 'push' || node.callee.property.name === 'replace')
        ) {
          const arg = node.arguments[0];
          if (!arg) return;

          const path = getStringValue(arg);
          if (path && path.startsWith('/') && !isAllowedPath(path)) {
            hasRouteUsage = true;
            const method = node.callee.property.name;
            context.report({
              node: arg,
              messageId: method === 'push' ? 'hardcodedPush' : 'hardcodedReplace',
              data: { path },
              fix(fixer) {
                return fixer.replaceText(arg, `route("${path}")`);
              }
            });
          }
        }

        // 检查 redirect("/path")
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'redirect'
        ) {
          const arg = node.arguments[0];
          if (!arg) return;

          const path = getStringValue(arg);
          if (path && path.startsWith('/') && !isAllowedPath(path)) {
            hasRouteUsage = true;
            context.report({
              node: arg,
              messageId: 'hardcodedRedirect',
              data: { path },
              fix(fixer) {
                return fixer.replaceText(arg, `route("${path}")`);
              }
            });
          }
        }
      },

      // 程序结束时检查导入
      'Program:exit'() {
        if (checkImports && hasRouteUsage && !hasRoutingImport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'missingRouting',
          });
        }
      }
    };
  }
};
