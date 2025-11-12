/**
 * ESLint 配置 - 包含自定义路由规则
 * 
 * 此配置扩展了标准的 .eslintrc.json 并添加了自定义规则
 */

module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'react-hooks'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json'
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  rules: {
    // === 自定义路由规则 ===
    'no-hardcoded-routes': ['error', {
      allowedPatterns: [
        '^https?://',  // 允许外部链接
        '^mailto:',    // 允许邮件链接
        '^tel:',       // 允许电话链接
        '^#',          // 允许锚点链接
      ],
      checkImports: true
    }],

    // === TypeScript 规则 ===
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    
    // === 代码质量规则 ===
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-atomic-updates': 'error',

    // === 导入规则 ===
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'warn',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-absolute-path': 'error',

    // === React Hooks 规则 ===
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['*.test.js', '*.test.jsx', '*.test.ts', '*.test.tsx'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // 自定义规则文件本身不检查
      files: ['eslint-rules/**/*.js'],
      rules: {
        'no-hardcoded-routes': 'off'
      }
    }
  ]
};

// 注册自定义规则
const noHardcodedRoutes = require('./eslint-rules/no-hardcoded-routes');

module.exports.rules = module.exports.rules || {};
module.exports.plugins = module.exports.plugins || [];

// 添加自定义规则插件
module.exports.plugins.push({
  rules: {
    'no-hardcoded-routes': noHardcodedRoutes
  }
});
