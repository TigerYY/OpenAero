# BOM 清单字段增强完成总结（方案 B - 完整增强）

## 实施时间
2025-01-XX

## 新增字段列表

### ✅ 高优先级字段（核心业务需求）

1. **`unit`** (String?, default: "个")
   - 数量单位（个、套、米、克等）
   - 类型: `String? @default("个")`

2. **`unitPrice`** (Decimal?)
   - 单价
   - 类型: `Decimal? @db.Decimal(10, 2)`

3. **`supplier`** (String?)
   - 供应商名称
   - 类型: `String?`

4. **`partNumber`** (String?)
   - 零件号/SKU
   - 类型: `String?`

5. **`manufacturer`** (String?)
   - 制造商
   - 类型: `String?`

### ✅ 中优先级字段（重要业务需求）

6. **`category`** (String?)
   - 物料类别
   - 类型: `String?`
   - 可选值: `FRAME`, `MOTOR`, `ESC`, `PROPELLER`, `FLIGHT_CONTROLLER`, `BATTERY`, `CAMERA`, `GIMBAL`, `RECEIVER`, `TRANSMITTER`, `OTHER`

7. **`position`** (String?)
   - 安装位置（机头、机尾、左臂、右臂等）
   - 类型: `String?`

8. **`weight`** (Decimal?)
   - 重量（克）
   - 类型: `Decimal? @db.Decimal(10, 3)`

9. **`specifications`** (Json?)
   - 详细规格参数（JSON格式，可存储电压、电流、功率等）
   - 类型: `Json?`

## 已完成的实施

### ✅ 1. Prisma Schema 更新

**文件**: `prisma/schema.prisma`

**变更**:
- ✅ 添加了所有方案 B 的字段
- ✅ 添加了字段注释说明
- ✅ 保持了向后兼容（所有新字段都是可选的）

**代码**:
```prisma
model SolutionBomItem {
  // ... 现有字段 ...
  
  // 基础信息
  unit     String? @default("个") // 数量单位
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
  specifications Json? // 详细规格参数
}
```

### ✅ 2. 数据库迁移脚本

**文件**: `supabase/migrations/013_enhance_solution_bom_items.sql`

**功能**:
- ✅ 添加所有新字段（9个字段）
- ✅ 添加字段注释
- ✅ 创建索引（category, partNumber, manufacturer）
- ✅ 包含验证步骤

**新增索引**:
- `solution_bom_items_category_idx` - 物料类别索引
- `solution_bom_items_partNumber_idx` - 零件号索引
- `solution_bom_items_manufacturer_idx` - 制造商索引

### ✅ 3. BOM API 路由更新

**文件**: `src/app/api/solutions/[id]/bom/route.ts`

**变更**:
- ✅ 更新 `bomItemSchema` Zod 验证 schema，支持所有新字段
- ✅ 更新 `PUT` 方法，支持创建包含新字段的 BOM 项
- ✅ 更新 `GET` 方法，返回所有新字段
- ✅ 添加字段验证（unitPrice >= 0, weight >= 0）
- ✅ 添加 category 枚举验证

**验证规则**:
- `unitPrice`: 必须 >= 0（如果提供）
- `weight`: 必须 >= 0（如果提供）
- `category`: 必须是预定义的枚举值之一

### ✅ 4. TypeScript 类型定义更新

**文件**:
- `src/shared/types/solutions.ts`
- `src/types/index.ts`

**变更**:
- ✅ 更新 `Solution` 接口的 `bom` 字段类型
- ✅ 更新 `SolutionBom` 接口
- ✅ 添加所有新字段的类型定义
- ✅ 添加 category 联合类型

### ✅ 5. 解决方案详情 API 更新

**文件**: `src/app/api/solutions/[id]/route.ts`

**变更**:
- ✅ 更新 `bomItems` 映射，包含所有新字段
- ✅ 正确转换 Decimal 类型为 Number
- ✅ 处理可选字段的默认值

## 字段使用示例

### API 请求示例（PUT /api/solutions/[id]/bom）

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
    },
    {
      "name": "2212 无刷电机",
      "model": "2212-920KV",
      "quantity": 4,
      "unit": "个",
      "unitPrice": 25.50,
      "supplier": "新西达",
      "partNumber": "XSD-2212-920",
      "manufacturer": "新西达",
      "category": "MOTOR",
      "position": "四轴",
      "weight": 55.0,
      "specifications": {
        "kv": 920,
        "maxCurrent": "18A",
        "maxPower": "200W"
      }
    }
  ]
}
```

### API 响应示例（GET /api/solutions/[id]/bom）

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bom_123",
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
        "product": {
          "id": "prod_123456",
          "name": "DJI F450 机架",
          "sku": "DJI-F450-001",
          "price": 89.00,
          "images": ["https://..."]
        },
        "createdAt": "2025-01-XXT..."
      }
    ]
  }
}
```

## 业务价值

### 1. 完整的成本管理
- ✅ 支持单价和总价计算
- ✅ 支持供应商信息管理
- ✅ 便于成本分析和采购决策

### 2. 精确的物料管理
- ✅ 零件号（partNumber）支持精确识别
- ✅ 制造商信息支持品牌管理
- ✅ 分类和位置支持结构化组织

### 3. 物理属性追踪
- ✅ 重量信息支持总重量计算
- ✅ 便于飞行性能评估
- ✅ 支持载重分析

### 4. 技术规格管理
- ✅ JSON 格式支持灵活的技术参数
- ✅ 支持电压、电流、功率等电子参数
- ✅ 支持尺寸、材料等物理参数

### 5. 商城集成
- ✅ 支持关联商城商品
- ✅ 支持一键跳转到商品详情
- ✅ 支持价格对比

## 数据库索引优化

新增的索引将提升以下查询性能：
- ✅ 按物料类别筛选（`category`）
- ✅ 按零件号查询（`partNumber`）
- ✅ 按制造商筛选（`manufacturer`）

## 下一步

### ⏳ 待完成

1. **前端表单组件更新**
   - 更新 BOM 编辑表单，支持所有新字段
   - 添加字段验证
   - 添加分类下拉选择
   - 添加规格参数编辑器

2. **前端展示组件更新**
   - 更新 BOM 列表展示
   - 添加分类筛选
   - 添加总成本计算
   - 添加总重量计算

3. **数据库迁移执行**
   - 执行 `supabase/migrations/013_enhance_solution_bom_items.sql`
   - 验证字段添加成功
   - 验证索引创建成功

4. **Prisma Client 生成**
   - 运行 `npx prisma generate`
   - 验证类型定义正确

5. **API 测试**
   - 测试创建 BOM（包含所有新字段）
   - 测试获取 BOM（验证所有字段返回）
   - 测试字段验证逻辑

## 注意事项

1. **向后兼容**: 所有新字段都是可选的，不影响现有数据
2. **数据验证**: API 层已添加字段验证，确保数据质量
3. **类型安全**: TypeScript 类型定义已更新，提供完整的类型支持
4. **性能优化**: 添加了必要的索引，提升查询性能

## 相关文件

- `prisma/schema.prisma` - Prisma Schema 定义
- `supabase/migrations/013_enhance_solution_bom_items.sql` - 数据库迁移脚本
- `src/app/api/solutions/[id]/bom/route.ts` - BOM API 路由
- `src/app/api/solutions/[id]/route.ts` - 方案详情 API
- `src/shared/types/solutions.ts` - TypeScript 类型定义
- `src/types/index.ts` - TypeScript 类型定义

