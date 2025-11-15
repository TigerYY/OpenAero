# BOM 清单字段结构分析

## 当前模型字段（SolutionBomItem）

根据 `prisma/schema.prisma`，当前 BOM 模型包含以下字段：

```prisma
model SolutionBomItem {
  id         String   @id @default(cuid())
  solutionId String
  solution   Solution @relation(fields: [solutionId], references: [id], onDelete: Cascade)

  name     String // 物料名称
  model    String? // 型号
  quantity Int    @default(1) // 数量
  notes    String? // 备注

  productId String? // 可关联商城商品ID（可选）
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())

  @@map("solution_bom_items")
}
```

## 业务需求分析

### 1. 规范文档要求（`solution-submission-flow-spec.md`）

规范文档中定义的字段：
- ✅ `name` - 物料名称
- ✅ `model` - 型号（可选）
- ✅ `quantity` - 数量
- ✅ `notes` - 备注（可选）
- ✅ `productId` - 可关联商城 SKU（可选）

### 2. 前端代码实际使用（`src/app/solutions/[id]/edit/page.tsx`）

前端代码中使用的字段：
```typescript
interface BomItem {
  name: string;
  quantity: number;
  unitPrice: number;  // ❌ 缺失
  supplier?: string;  // ❌ 缺失
  partNumber?: string; // ❌ 缺失
}
```

### 3. TypeScript 类型定义（`src/shared/types/solutions.ts`）

类型定义中的字段：
```typescript
bom?: Array<{
  name: string;
  quantity: number;
  unitPrice: number;  // ❌ 缺失
  supplier?: string;  // ❌ 缺失
  partNumber?: string; // ❌ 缺失
}>;
```

### 4. 无人机 BOM 业务场景需求

无人机 BOM 清单通常需要包含以下信息：

#### 基础信息（当前已有）
- ✅ 物料名称 (`name`)
- ✅ 型号 (`model`)
- ✅ 数量 (`quantity`)
- ✅ 备注 (`notes`)

#### 价格和成本（缺失）
- ❌ **单价** (`unitPrice` / `price`) - 用于计算总成本
- ❌ **总价** (`totalPrice`) - 可计算，但可能需要存储
- ❌ **货币单位** (`currency`) - 如果支持多币种

#### 供应商信息（缺失）
- ❌ **供应商名称** (`supplier`) - 采购来源
- ❌ **供应商联系方式** (`supplierContact`) - 可选
- ❌ **供应商链接** (`supplierUrl`) - 可选

#### 零件标识（缺失）
- ❌ **零件号** (`partNumber` / `sku`) - 制造商零件编号
- ❌ **制造商** (`manufacturer`) - 制造商名称
- ❌ **批次号** (`batchNumber`) - 可选，用于追溯

#### 物理属性（缺失）
- ❌ **单位** (`unit`) - 数量单位（个、套、米、克等）
- ❌ **重量** (`weight`) - 单个物料重量（克/千克）
- ❌ **尺寸** (`dimensions`) - 长宽高（JSON 或单独字段）
- ❌ **颜色** (`color`) - 可选

#### 分类和位置（缺失）
- ❌ **类别** (`category` / `type`) - 物料类别（机架、电机、电调、飞控、电池等）
- ❌ **位置** (`position` / `location`) - 安装位置（机头、机尾、左臂、右臂等）
- ❌ **层级** (`level` / `tier`) - BOM 层级（主件、子件）

#### 技术规格（缺失）
- ❌ **规格参数** (`specifications`) - JSON 格式存储详细规格
- ❌ **电压** (`voltage`) - 电子元件电压
- ❌ **电流** (`current`) - 电子元件电流
- ❌ **功率** (`power`) - 功率参数

#### 其他（可选）
- ❌ **图片** (`imageUrl`) - 物料图片
- ❌ **数据表链接** (`datasheetUrl`) - 技术文档链接
- ❌ **替代品** (`alternatives`) - 可替代的物料列表
- ❌ **关键程度** (`criticality`) - 关键/非关键物料
- ❌ **采购难度** (`procurementDifficulty`) - 易采购/难采购

## 字段重要性评估

### 🔴 高优先级（核心业务需求）

1. **`unitPrice` / `price`** (Decimal)
   - **原因**: 前端代码已使用，用于成本计算
   - **类型**: `Decimal @db.Decimal(10, 2)`
   - **必填**: 否（可选，但建议必填）

2. **`partNumber`** (String)
   - **原因**: 前端代码已使用，零件号是 BOM 的核心标识
   - **类型**: `String?`
   - **必填**: 否（可选，但建议必填）

3. **`supplier`** (String)
   - **原因**: 前端代码已使用，供应商信息对采购很重要
   - **类型**: `String?`
   - **必填**: 否（可选）

4. **`unit`** (String)
   - **原因**: 数量单位对 BOM 很重要（个、套、米等）
   - **类型**: `String? @default("个")`
   - **必填**: 否（可选，有默认值）

### 🟡 中优先级（重要业务需求）

5. **`category`** (String / Enum)
   - **原因**: 物料分类有助于组织和管理 BOM
   - **类型**: `String?` 或创建 `BomItemCategory` 枚举
   - **建议值**: `FRAME`, `MOTOR`, `ESC`, `PROPELLER`, `FLIGHT_CONTROLLER`, `BATTERY`, `CAMERA`, `GIMBAL`, `RECEIVER`, `TRANSMITTER`, `OTHER`
   - **必填**: 否（可选）

6. **`weight`** (Decimal)
   - **原因**: 无人机总重量计算需要
   - **类型**: `Decimal? @db.Decimal(10, 3)` (单位：克)
   - **必填**: 否（可选）

7. **`manufacturer`** (String)
   - **原因**: 制造商信息有助于识别和采购
   - **类型**: `String?`
   - **必填**: 否（可选）

8. **`specifications`** (Json)
   - **原因**: 存储详细的技术规格参数
   - **类型**: `Json?`
   - **必填**: 否（可选）

### 🟢 低优先级（可选功能）

9. **`position`** (String)
   - **原因**: 安装位置信息，对组装有帮助
   - **类型**: `String?`
   - **必填**: 否（可选）

10. **`imageUrl`** (String)
    - **原因**: 物料图片，提升用户体验
    - **类型**: `String?`
    - **必填**: 否（可选）

11. **`datasheetUrl`** (String)
    - **原因**: 技术文档链接
    - **类型**: `String?`
    - **必填**: 否（可选）

## 推荐方案

### 方案 A：最小化增强（推荐）

只添加**高优先级**字段，满足当前业务需求：

```prisma
model SolutionBomItem {
  id         String   @id @default(cuid())
  solutionId String
  solution   Solution @relation(fields: [solutionId], references: [id], onDelete: Cascade)

  // 基础信息
  name     String // 物料名称
  model    String? // 型号
  quantity Int    @default(1) // 数量
  unit     String? @default("个") // 数量单位（新增）
  notes    String? // 备注

  // 价格和成本（新增）
  unitPrice Decimal? @db.Decimal(10, 2) // 单价（新增）

  // 供应商信息（新增）
  supplier String? // 供应商名称（新增）

  // 零件标识（新增）
  partNumber String? // 零件号/SKU（新增）
  manufacturer String? // 制造商（新增）

  // 关联商城商品
  productId String? // 可关联商城商品ID（可选）
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())

  @@map("solution_bom_items")
}
```

**新增字段**：
- `unit` - 数量单位
- `unitPrice` - 单价
- `supplier` - 供应商
- `partNumber` - 零件号
- `manufacturer` - 制造商

### 方案 B：完整增强

添加**高优先级 + 中优先级**字段：

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
  partNumber String? // 零件号/SKU
  manufacturer String? // 制造商

  // 分类和位置
  category String? // 物料类别（FRAME, MOTOR, ESC等）
  position String? // 安装位置

  // 物理属性
  weight Decimal? @db.Decimal(10, 3) // 重量（克）

  // 技术规格
  specifications Json? // 详细规格参数（JSON）

  // 关联商城商品
  productId String? // 可关联商城商品ID（可选）
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())

  @@map("solution_bom_items")
}
```

**新增字段**（方案 A + 中优先级）：
- `category` - 物料类别
- `position` - 安装位置
- `weight` - 重量
- `specifications` - 技术规格

## 建议

### 立即实施（方案 A）

建议先实施**方案 A**，原因：
1. ✅ 满足前端代码的当前需求（`unitPrice`, `supplier`, `partNumber`）
2. ✅ 满足核心业务需求（价格、供应商、零件号）
3. ✅ 改动最小，风险最低
4. ✅ 可以快速上线

### 后续扩展（方案 B）

如果业务发展需要，可以后续添加中优先级字段：
- 通过数据库迁移添加新字段
- 不影响现有数据
- 渐进式增强

## 实施步骤

1. ✅ **分析当前需求**（本文档）
2. ✅ **确定最终方案**（方案 B - 完整增强）
3. ✅ **更新 Prisma Schema**
4. ✅ **创建数据库迁移**
5. ✅ **更新 API 路由**（BOM 相关）
6. ✅ **更新 TypeScript 类型定义**
7. ⏳ **执行数据库迁移**（运行 `npm run db:bom-enhancement`）
8. ⏳ **更新前端代码**（BOM 表单和展示）

## 注意事项

1. **向后兼容**: 新增字段都是可选的，不影响现有数据
2. **数据验证**: 在 API 层添加字段验证逻辑
3. **前端适配**: 更新前端表单和展示组件
4. **文档更新**: 更新 API 文档和类型定义

