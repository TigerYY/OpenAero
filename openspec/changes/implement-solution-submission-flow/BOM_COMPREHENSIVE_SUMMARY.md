# BOM（物料清单）功能综合总结

**版本**: 1.0.0  
**最后更新**: 2024-12  
**状态**: ✅ 已完成

## 📋 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [字段定义](#字段定义)
- [数据模型](#数据模型)
- [API 接口](#api-接口)
- [前端组件](#前端组件)
- [数据迁移](#数据迁移)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [相关文档](#相关文档)

## 概述

BOM（Bill of Materials，物料清单）是方案管理系统的核心功能之一，用于管理无人机方案所需的物料信息。系统支持完整的物料信息管理，包括基础信息、价格成本、供应商信息、零件标识、物理属性、技术规格等。

### 核心价值

1. **完整的物料信息管理**: 支持 14+ 个字段，覆盖物料管理的各个方面
2. **灵活的规格参数**: 使用 JSON 格式存储动态技术规格
3. **商城商品关联**: 可关联商城商品，实现一键采购
4. **成本计算**: 自动计算总成本和总重量
5. **分类管理**: 支持 11 种物料类别分类
6. **向后兼容**: 支持旧的 JSON 格式，平滑迁移

## 功能特性

### ✅ 已实现功能

1. **完整的字段支持**
   - 基础信息：名称、型号、数量、单位、备注
   - 价格成本：单价
   - 供应商信息：供应商名称
   - 零件标识：零件号、制造商
   - 分类位置：物料类别、安装位置
   - 物理属性：重量
   - 技术规格：JSON 格式动态规格

2. **API 接口**
   - `PUT /api/solutions/[id]/bom` - 更新 BOM 清单
   - `GET /api/solutions/[id]/bom` - 获取 BOM 清单
   - 支持双写策略（过渡期）
   - 支持 JSON fallback（向后兼容）

3. **前端组件**
   - `BomForm` - BOM 编辑表单组件
   - `BomList` - BOM 列表展示组件
   - 统计信息展示（总数、总成本、总重量）
   - 分类统计

4. **数据迁移**
   - 迁移脚本（JSON → 关系表）
   - 验证脚本
   - 状态检查脚本
   - 回滚支持

## 字段定义

### 基础字段（必填）

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| `name` | String | 物料名称 | ✅ |
| `quantity` | Int | 数量 | ✅ |

### 基础字段（可选）

| 字段名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `model` | String? | 型号 | null |
| `unit` | String? | 数量单位（个、套、米、克等） | "个" |
| `notes` | String? | 备注 | null |

### 价格和成本

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `unitPrice` | Decimal? | 单价（Decimal(10, 2)） |

### 供应商信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `supplier` | String? | 供应商名称 |

### 零件标识

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `partNumber` | String? | 零件号/SKU |
| `manufacturer` | String? | 制造商 |

### 分类和位置

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `category` | String? | 物料类别（11个枚举值） |
| `position` | String? | 安装位置（机头、机尾、左臂、右臂等） |

### 物理属性

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `weight` | Decimal? | 重量（克，Decimal(10, 3)） |

### 技术规格

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `specifications` | Json? | 详细规格参数（JSON格式，可存储电压、电流、功率等） |

### 关联字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `productId` | String? | 关联商城商品ID（可选） |

### 物料类别枚举

```typescript
enum BomCategory {
  FRAME = 'FRAME',                    // 机架
  MOTOR = 'MOTOR',                    // 电机
  ESC = 'ESC',                        // 电调
  PROPELLER = 'PROPELLER',            // 螺旋桨
  FLIGHT_CONTROLLER = 'FLIGHT_CONTROLLER', // 飞控
  BATTERY = 'BATTERY',                // 电池
  CAMERA = 'CAMERA',                  // 相机
  GIMBAL = 'GIMBAL',                  // 云台
  RECEIVER = 'RECEIVER',              // 接收机
  TRANSMITTER = 'TRANSMITTER',        // 发射机
  OTHER = 'OTHER'                     // 其他
}
```

## 数据模型

### Prisma Schema

```prisma
model SolutionBomItem {
  id         String   @id @default(cuid())
  solutionId String
  solution   Solution @relation(fields: [solutionId], references: [id], onDelete: Cascade)

  // 基础信息
  name     String // 物料名称
  model    String? // 型号
  quantity Int    @default(1) // 数量
  unit     String? @default("个") // 数量单位
  notes    String? // 备注

  // 价格和成本
  unitPrice Decimal? @db.Decimal(10, 2) // 单价

  // 供应商信息
  supplier String? // 供应商名称

  // 零件标识
  partNumber   String? // 零件号/SKU
  manufacturer String? // 制造商

  // 分类和位置
  category String? // 物料类别
  position String? // 安装位置

  // 物理属性
  weight Decimal? @db.Decimal(10, 3) // 重量（克）

  // 技术规格
  specifications Json? // 详细规格参数（JSON格式）

  // 关联商城商品
  productId String? // 可关联商城商品ID（可选）
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())

  @@map("solution_bom_items")
}
```

### 数据库索引

```sql
-- 物料类别索引
CREATE INDEX solution_bom_items_category_idx 
  ON solution_bom_items(category);

-- 零件号索引
CREATE INDEX solution_bom_items_partNumber_idx 
  ON solution_bom_items("partNumber");

-- 制造商索引
CREATE INDEX solution_bom_items_manufacturer_idx 
  ON solution_bom_items(manufacturer);
```

## API 接口

### PUT /api/solutions/[id]/bom

更新方案的 BOM 清单。

**权限**: CREATOR（方案所有者）、ADMIN、SUPER_ADMIN

**请求示例**:

```json
{
  "items": [
    {
      "name": "DJI F450 机架",
      "model": "F450",
      "quantity": 1,
      "unit": "套",
      "unitPrice": 89.00,
      "supplier": "DJI官方",
      "partNumber": "DJI-F450-001",
      "manufacturer": "DJI",
      "category": "FRAME",
      "position": "主体",
      "weight": 350.5,
      "specifications": {
        "material": "碳纤维",
        "size": "450mm",
        "maxPayload": "1000g"
      },
      "productId": "prod_123456"
    }
  ]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bom_101",
        "solutionId": "solution_123",
        "name": "DJI F450 机架",
        "model": "F450",
        "quantity": 1,
        "unit": "套",
        "unitPrice": 89.00,
        "supplier": "DJI官方",
        "partNumber": "DJI-F450-001",
        "manufacturer": "DJI",
        "category": "FRAME",
        "position": "主体",
        "weight": 350.5,
        "specifications": {
          "material": "碳纤维",
          "size": "450mm",
          "maxPayload": "1000g"
        },
        "productId": "prod_123456",
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ]
  },
  "message": "BOM 清单已更新"
}
```

### GET /api/solutions/[id]/bom

获取方案的 BOM 清单。

**权限**: 与 `GET /api/solutions/[id]` 相同

**响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bom_101",
        "name": "DJI F450 机架",
        "model": "F450",
        "quantity": 1,
        "unit": "套",
        "unitPrice": 89.00,
        "supplier": "DJI官方",
        "partNumber": "DJI-F450-001",
        "manufacturer": "DJI",
        "category": "FRAME",
        "position": "主体",
        "weight": 350.5,
        "specifications": {
          "material": "碳纤维",
          "size": "450mm"
        },
        "productId": "prod_123456"
      }
    ]
  }
}
```

**数据兼容性**:
- 优先返回 `SolutionBomItem` 表数据
- 如果表数据不存在，fallback 到 `Solution.bom` JSON 字段（向后兼容）

## 前端组件

### BomForm 组件

BOM 编辑表单组件，支持所有字段的编辑。

**位置**: `src/components/solutions/BomForm.tsx`

**Props**:

```typescript
interface BomFormProps {
  items: BomItem[];
  onChange: (items: BomItem[]) => void;
  readonly?: boolean;
  showAdvanced?: boolean;
}
```

**使用示例**:

```tsx
import { BomForm } from '@/components/solutions';

function CreateSolutionPage() {
  const [bomItems, setBomItems] = useState<BomItem[]>([]);

  return (
    <BomForm
      items={bomItems}
      onChange={setBomItems}
      readonly={false}
      showAdvanced={true}
    />
  );
}
```

**功能特性**:
- ✅ 支持所有字段编辑
- ✅ 物料类别下拉选择
- ✅ 数量单位下拉选择
- ✅ 技术规格动态编辑
- ✅ 统计信息展示（总数、总成本、总重量）
- ✅ 响应式设计

### BomList 组件

BOM 列表展示组件，用于展示方案的 BOM 清单。

**位置**: `src/components/solutions/BomList.tsx`

**Props**:

```typescript
interface BomListProps {
  items: BomListItem[];
  showAdvanced?: boolean;
  showStatistics?: boolean;
}
```

**使用示例**:

```tsx
import { BomList } from '@/components/solutions';

function SolutionDetailPage() {
  const bomItems: BomListItem[] = [...];

  return (
    <BomList
      items={bomItems}
      showAdvanced={true}
      showStatistics={true}
    />
  );
}
```

**功能特性**:
- ✅ 完整的表格展示
- ✅ 统计信息卡片（物料总数、总成本、总重量）
- ✅ 物料分类统计
- ✅ 技术规格详情展示
- ✅ 关联商品链接
- ✅ 响应式设计

## 数据迁移

### 迁移状态

**当前状态**: ✅ 无需迁移

- 数据库中没有 `bom` JSON 字段
- 所有 BOM 数据直接存储在 `solution_bom_items` 表中
- API 支持双写策略（如果 `bom` 字段存在）

### 迁移工具

#### 1. 检查迁移状态

```bash
npm run bom:check
```

#### 2. 预览迁移

```bash
npm run bom:migrate:dry-run
```

#### 3. 执行迁移

```bash
npm run bom:migrate
```

#### 4. 验证数据完整性

```bash
npm run bom:validate:report
```

#### 5. 回滚迁移

```bash
npm run bom:migrate:rollback
```

### 双写策略

在迁移过渡期间，API 支持双写策略：

- **写入**: 同时写入 `SolutionBomItem` 表和 `Solution.bom` JSON 字段（如果字段存在）
- **读取**: 优先读取 `SolutionBomItem` 表，如果不存在则 fallback 到 JSON 字段

可以通过环境变量控制：

```bash
ENABLE_BOM_DUAL_WRITE=false  # 禁用双写
```

## 使用示例

### 创建 BOM 清单

```typescript
const response = await fetch(`/api/solutions/${solutionId}/bom`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [
      {
        name: 'DJI F450 机架',
        model: 'F450',
        quantity: 1,
        unit: '套',
        unitPrice: 89.00,
        supplier: 'DJI官方',
        partNumber: 'DJI-F450-001',
        manufacturer: 'DJI',
        category: 'FRAME',
        position: '主体',
        weight: 350.5,
        specifications: {
          material: '碳纤维',
          size: '450mm',
          maxPayload: '1000g'
        }
      },
      {
        name: 'T-Motor MN4014 电机',
        model: 'MN4014',
        quantity: 4,
        unit: '个',
        unitPrice: 150.00,
        supplier: 'T-Motor官方',
        partNumber: 'TM-MN4014',
        manufacturer: 'T-Motor',
        category: 'MOTOR',
        position: '四轴',
        weight: 120.5,
        specifications: {
          KV: 400,
          power: '500W'
        }
      }
    ]
  })
});
```

### 获取 BOM 清单

```typescript
const response = await fetch(`/api/solutions/${solutionId}/bom`);
const data = await response.json();

// 计算总成本
const totalCost = data.data.items.reduce((sum, item) => {
  return sum + (item.unitPrice || 0) * item.quantity;
}, 0);

// 计算总重量
const totalWeight = data.data.items.reduce((sum, item) => {
  return sum + (item.weight || 0) * item.quantity;
}, 0);
```

### 前端组件使用

```tsx
import { BomForm, BomList } from '@/components/solutions';

function SolutionForm() {
  const [bomItems, setBomItems] = useState<BomItem[]>([]);

  const handleSubmit = async () => {
    await fetch(`/api/solutions/${solutionId}/bom`, {
      method: 'PUT',
      body: JSON.stringify({ items: bomItems })
    });
  };

  return (
    <div>
      <BomForm
        items={bomItems}
        onChange={setBomItems}
        showAdvanced={true}
      />
      <BomList
        items={bomItems}
        showAdvanced={true}
        showStatistics={true}
      />
    </div>
  );
}
```

## 最佳实践

### 1. 字段使用

- ✅ **必填字段**: 始终提供 `name` 和 `quantity`
- ✅ **价格信息**: 提供 `unitPrice` 以便计算总成本
- ✅ **分类信息**: 使用 `category` 进行分类管理
- ✅ **技术规格**: 使用 `specifications` JSON 存储动态规格

### 2. 数据验证

- ✅ 使用 API 层的 Zod 验证
- ✅ 前端表单验证
- ✅ 确保数量为正整数
- ✅ 确保单价为非负数

### 3. 性能优化

- ✅ 使用索引字段（category、partNumber、manufacturer）进行查询
- ✅ 限制 BOM 项数量（建议 < 100）
- ✅ 使用分页（如果 BOM 项很多）

### 4. 用户体验

- ✅ 提供默认值（如 `unit: "个"`）
- ✅ 使用下拉选择（category、unit）
- ✅ 显示统计信息（总数、总成本、总重量）
- ✅ 提供技术规格编辑界面

## 相关文档

### 核心文档

- [BOM 文档索引](./BOM_DOCUMENTATION_INDEX.md) - 所有 BOM 文档索引
- [字段分析文档](./BOM_FIELD_ANALYSIS.md) - 字段需求分析
- [实施总结](./BOM_IMPLEMENTATION_SUMMARY.md) - 后端实施总结
- [前端完成总结](./BOM_FRONTEND_COMPLETE.md) - 前端组件总结
- [迁移状态报告](./BOM_MIGRATION_STATUS.md) - 迁移状态说明

### API 文档

- [API 参考文档](../../DOCS/api/solutions-api-reference.md#bom-管理-api) - BOM API 完整参考
- [开发指南](../../DOCS/development/solution-submission-flow-guide.md#数据迁移流程) - BOM 迁移流程

### 代码文件

- **Schema**: `prisma/schema.prisma`
- **API 路由**: `src/app/api/solutions/[id]/bom/route.ts`
- **前端组件**: `src/components/solutions/BomForm.tsx`, `BomList.tsx`
- **迁移脚本**: `scripts/migrate-bom-to-table.ts`
- **验证脚本**: `scripts/validate-bom-data-integrity.ts`
- **状态检查**: `scripts/check-bom-migration-status.ts`

## 总结

BOM 功能已完整实现，包括：

- ✅ **14+ 个字段支持**: 覆盖物料管理的各个方面
- ✅ **完整的 API**: 支持创建、查询、更新
- ✅ **前端组件**: 提供编辑和展示组件
- ✅ **数据迁移**: 支持从 JSON 迁移到关系表
- ✅ **向后兼容**: 支持旧的 JSON 格式
- ✅ **性能优化**: 添加了必要的索引
- ✅ **文档完善**: 提供了完整的文档

BOM 功能已准备好用于生产环境！

