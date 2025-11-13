# 测试框架文档

## 概述

OpenAero 项目采用了增强的测试框架，提供全面的测试工具和实用程序，确保代码质量和应用稳定性。

## 测试架构

### 核心技术栈
- **Jest**: 测试运行器和断言库
- **React Testing Library**: React 组件测试
- **Next.js Testing**: Next.js 应用测试支持
- **TypeScript**: 类型安全的测试代码

### 测试类型
1. **单元测试**: 测试独立的函数和组件
2. **集成测试**: 测试组件间的交互
3. **端到端测试**: 测试完整的用户流程
4. **快照测试**: 确保 UI 组件的一致性

## 配置文件

### Jest 配置 (`jest.config.enhanced.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### 测试设置 (`jest.setup.js`)
```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// 全局 polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 模拟 Next.js 路由
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

## 测试工具

### 测试实用程序 (`tests/utils/test-mocks.ts`)

#### Mock 数据
```typescript
// 用户数据
export const mockUser = {
  id: 'user-123',
  name: '测试用户',
  email: 'test@example.com',
  role: 'user' as const,
};

// 解决方案数据
export const mockSolution = {
  id: 'solution-123',
  title: '测试解决方案',
  description: '这是一个测试解决方案',
  category: 'technology',
  tags: ['react', 'typescript'],
  createdAt: '2024-01-01T00:00:00Z',
};
```

#### API Mock 函数
```typescript
// 成功响应
export const mockApiResponse = <T>(data: T) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

// 错误响应
export const mockApiError = (status: number, message: string) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
});
```

#### 浏览器 API Mock
```typescript
// IntersectionObserver Mock
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  (window as any).IntersectionObserver = mockIntersectionObserver;
};

// ResizeObserver Mock
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  (window as any).ResizeObserver = mockResizeObserver;
};
```

## 测试脚本

### 可用命令
```json
{
  "scripts": {
    "test": "jest",
    "test:enhanced": "jest --config=jest.config.enhanced.js",
    "test:watch": "jest --watch",
    "test:watch:enhanced": "jest --watch --config=jest.config.enhanced.js",
    "test:coverage": "jest --coverage",
    "test:coverage:enhanced": "jest --coverage --config=jest.config.enhanced.js",
    "test:ci": "jest --ci --coverage --watchAll=false --config=jest.config.enhanced.js"
  }
}
```

### 命令说明
- `test:enhanced`: 使用增强配置运行测试
- `test:watch:enhanced`: 监视模式运行测试
- `test:coverage:enhanced`: 生成覆盖率报告
- `test:ci`: CI 环境测试（无监视，生成覆盖率）

## 编写测试

### 组件测试示例

#### 基础组件测试
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### 带 Provider 的组件测试
```typescript
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SolutionCard } from '@/components/SolutionCard';
import { mockSolution } from '@/tests/utils/test-mocks';

const messages = {
  'solutions.readMore': 'Read More',
  'solutions.category': 'Category',
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('SolutionCard', () => {
  it('displays solution information', () => {
    renderWithProviders(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText(mockSolution.title)).toBeInTheDocument();
    expect(screen.getByText(mockSolution.description)).toBeInTheDocument();
  });
});
```

### API 测试示例
```typescript
import { GET, POST } from '@/app/api/solutions/route';
import { mockApiResponse, mockSolution } from '@/tests/utils/test-mocks';

// Mock fetch
global.fetch = jest.fn();

describe('/api/solutions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns solutions list', async () => {
      const mockSolutions = [mockSolution];
      (fetch as jest.Mock).mockResolvedValue(mockApiResponse(mockSolutions));

      const request = new Request('http://localhost:3000/api/solutions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSolutions);
    });
  });
});
```

### Hook 测试示例
```typescript
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe('"updated"');
  });
});
```

## 测试最佳实践

### 1. 测试结构
```typescript
describe('ComponentName', () => {
  // 设置和清理
  beforeEach(() => {
    // 测试前的准备工作
  });

  afterEach(() => {
    // 测试后的清理工作
  });

  // 分组相关测试
  describe('when user is authenticated', () => {
    it('should display user dashboard', () => {
      // 测试实现
    });
  });

  describe('when user is not authenticated', () => {
    it('should redirect to login', () => {
      // 测试实现
    });
  });
});
```

### 2. 测试命名
- 使用描述性的测试名称
- 遵循 "should [expected behavior] when [condition]" 模式
- 使用中文描述复杂的业务逻辑

### 3. 断言原则
- 每个测试应该有明确的断言
- 避免过多的断言在单个测试中
- 使用语义化的断言方法

### 4. Mock 策略
- 只 mock 必要的依赖
- 使用真实数据结构的 mock
- 在测试间清理 mock 状态

### 5. 异步测试
```typescript
it('handles async operations', async () => {
  const promise = fetchData();
  
  // 等待异步操作完成
  await expect(promise).resolves.toEqual(expectedData);
  
  // 或者使用 waitFor
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

## 覆盖率要求

### 全局阈值
- **分支覆盖率**: 85%
- **函数覆盖率**: 85%
- **行覆盖率**: 85%
- **语句覆盖率**: 85%

### 覆盖率报告
- 运行 `npm run test:coverage:enhanced` 生成报告
- 报告位置: `coverage/lcov-report/index.html`
- CI 环境自动检查覆盖率阈值

## CI/CD 集成

### GitHub Actions 配置
```yaml
- name: Run Enhanced Tests
  run: npm run test:ci

- name: Check Coverage Threshold
  run: |
    COVERAGE=$(npm run test:coverage:enhanced --silent | grep -o 'All files.*[0-9.]*%' | tail -1 | grep -o '[0-9.]*%' | head -1 | sed 's/%//')
    if (( $(echo "$COVERAGE < 85" | bc -l) )); then
      echo "Coverage $COVERAGE% is below threshold 85%"
      exit 1
    fi
```

### 质量门禁
- 所有测试必须通过
- 覆盖率必须达到阈值
- 无 TypeScript 错误
- 通过 ESLint 检查

## 故障排除

### 常见问题

1. **测试超时**
   ```typescript
   // 增加超时时间
   it('long running test', async () => {
     // 测试代码
   }, 10000); // 10秒超时
   ```

2. **异步状态更新**
   ```typescript
   // 使用 waitFor 等待状态更新
   await waitFor(() => {
     expect(screen.getByText('Updated')).toBeInTheDocument();
   });
   ```

3. **Mock 不生效**
   ```typescript
   // 确保在测试前清理 mock
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### 调试技巧
- 使用 `screen.debug()` 查看当前 DOM
- 使用 `console.log` 输出中间状态
- 运行单个测试文件: `npm test -- ComponentName.test.tsx`

## 性能优化

### 测试性能
- 使用 `--maxWorkers` 控制并发数
- 避免不必要的 DOM 渲染
- 合理使用 `beforeEach` 和 `afterEach`

### 内存管理
- 及时清理事件监听器
- 避免内存泄漏的 mock
- 使用 `cleanup` 清理测试环境

---

更多测试相关问题，请参考 [Jest 官方文档](https://jestjs.io/) 和 [React Testing Library 文档](https://testing-library.com/docs/react-testing-library/intro/)。