# 订单支付系统文档

**版本**: 1.0.0  
**最后更新**: 2025-01-16  
**状态**: ✅ 已发布  
**相关文档**: [API文档](./API_DOCUMENTATION.md) | [数据库架构](./DATABASE_SCHEMA.md) | [方案工作流](./SOLUTION_WORKFLOW.md)

---

## 📋 目录

1. [概述](#概述)
2. [订单系统](#订单系统)
3. [支付系统](#支付系统)
4. [退款系统](#退款系统)
5. [收益分成](#收益分成)
6. [订单状态流转](#订单状态流转)
7. [安全机制](#安全机制)
8. [API接口](#api接口)
9. [最佳实践](#最佳实践)
10. [故障处理](#故障处理)

---

## 概述

### 业务背景

OpenAero 订单支付系统负责处理平台上所有的交易活动，包括：
- 📦 **订单管理**：创建、查询、取消订单
- 💳 **支付处理**：支持支付宝、微信支付等多种支付方式
- 💰 **收益分成**：创作者收益计算和结算
- 🔄 **退款处理**：订单退款和资金返还

### 核心功能

- ✅ **多支付方式**：支付宝、微信支付、余额支付
- ✅ **订单追踪**：完整的订单生命周期管理
- ✅ **自动分成**：平台和创作者收益自动分配
- ✅ **退款机制**：完善的退款申请和审批流程
- ✅ **交易安全**：支付验签、防重放攻击
- ✅ **对账系统**：支付对账和数据同步

---

## 订单系统

### 订单数据模型

```typescript
interface Order {
  id: string;                    // 订单ID
  orderNumber: string;           // 订单号（唯一）
  userId: string;                // 购买用户ID
  status: OrderStatus;           // 订单状态
  totalAmount: Decimal;          // 订单总金额
  currency: string;              // 货币类型（默认CNY）
  notes?: string;                // 订单备注
  shippingAddress?: object;      // 收货地址（JSON）
  billingAddress?: object;       // 账单地址（JSON）
  createdAt: Date;              // 创建时间
  updatedAt: Date;              // 更新时间
  
  // 关联关系
  orderSolutions: OrderSolution[]; // 订单方案列表
  paymentTransactions: Payment[];  // 支付记录
}

interface OrderSolution {
  id: string;
  orderId: string;
  solutionId: string;
  quantity: number;              // 购买数量（通常为1）
  unitPrice: Decimal;            // 单价
  subtotal: Decimal;             // 小计
  solution: Solution;            // 关联方案
}
```

### 订单状态枚举

```typescript
enum OrderStatus {
  PENDING    = 'PENDING',     // 待支付
  CONFIRMED  = 'CONFIRMED',   // 已确认（已支付）
  PROCESSING = 'PROCESSING',  // 处理中
  SHIPPED    = 'SHIPPED',     // 已发货（对于实物商品）
  DELIVERED  = 'DELIVERED',   // 已交付
  CANCELLED  = 'CANCELLED',   // 已取消
  REFUNDED   = 'REFUNDED'     // 已退款
}
```

### 订单状态流转图

```
┌─────────────────────────────────────────────────────────────────┐
│                      订单生命周期流程图                           │
└─────────────────────────────────────────────────────────────────┘

    [创建订单]
        ↓
    ┌─────────┐
    │ PENDING │ ────────┐
    │ 待支付  │         │
    └─────────┘         │ 超时未支付
        │               │
        │ 支付成功        ↓
        ↓           ┌───────────┐
    ┌───────────┐  │ CANCELLED │
    │ CONFIRMED │  │  已取消   │
    │  已确认   │  └───────────┘
    └───────────┘
        │
        │ 开始处理
        ↓
    ┌─────────────┐
    │ PROCESSING  │
    │   处理中    │
    └─────────────┘
        │
        │ 交付完成
        ↓
    ┌───────────┐
    │ DELIVERED │
    │  已交付   │
    └───────────┘
        │
        ├─────正常完成────→ [订单完成]
        │
        └─────申请退款────┐
                        ↓
                   ┌──────────┐
                   │ REFUNDED │
                   │  已退款  │
                   └──────────┘
```

### 订单创建流程

#### 步骤 1：添加到购物车

```typescript
// 前端：添加方案到购物车
const addToCart = (solution: Solution) => {
  const cartItem = {
    solutionId: solution.id,
    title: solution.title,
    price: solution.price,
    quantity: 1
  };
  
  // 存储到 localStorage 或 Redux
  localStorage.setItem('cart', JSON.stringify([cartItem]));
};
```

#### 步骤 2：创建订单

```typescript
// API: POST /api/orders
const createOrder = async (orderData: {
  items: Array<{
    solutionId: string;
    quantity: number;
    price: number;
  }>;
  notes?: string;
  shippingAddress?: object;
  billingAddress?: object;
}) => {
  // 1. 验证用户身份
  const user = await getServerUser();
  if (!user) throw new Error('未授权');
  
  // 2. 验证方案可用性和价格
  for (const item of orderData.items) {
    const solution = await prisma.solution.findUnique({
      where: { id: item.solutionId }
    });
    
    if (!solution || solution.status !== 'PUBLISHED') {
      throw new Error('方案不可用');
    }
    
    if (solution.price !== item.price) {
      throw new Error('价格已变动，请刷新页面');
    }
  }
  
  // 3. 计算总金额
  const totalAmount = orderData.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );
  
  // 4. 生成订单号
  const orderNumber = generateOrderNumber();
  
  // 5. 创建订单
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      status: 'PENDING',
      totalAmount,
      currency: 'CNY',
      notes: orderData.notes,
      shippingAddress: orderData.shippingAddress,
      billingAddress: orderData.billingAddress,
      orderSolutions: {
        create: orderData.items.map(item => ({
          solutionId: item.solutionId,
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity
        }))
      }
    },
    include: {
      orderSolutions: {
        include: { solution: true }
      }
    }
  });
  
  return order;
};
```

**订单号生成规则**:
```typescript
function generateOrderNumber(): string {
  // 格式: yyyyMMddHHmmss + 6位随机数
  const timestamp = new Date().toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `OA${timestamp}${random}`;
}
// 示例: OA20250116153045123456
```

#### 步骤 3：订单确认

```typescript
// 返回订单确认信息给前端
const orderConfirmation = {
  orderId: order.id,
  orderNumber: order.orderNumber,
  totalAmount: order.totalAmount,
  items: order.orderSolutions.map(os => ({
    title: os.solution.title,
    quantity: os.quantity,
    price: os.unitPrice
  })),
  paymentMethods: [
    { type: 'ALIPAY', name: '支付宝' },
    { type: 'WECHAT', name: '微信支付' },
    { type: 'BALANCE', name: '余额支付' }
  ]
};
```

---

## 支付系统

### 支付方式

| 支付方式 | 代码 | 支持场景 | 手续费 |
|---------|------|---------|-------|
| 支付宝 | `ALIPAY` | Web/H5/APP | 0.6% |
| 微信支付 | `WECHAT` | Web/H5/小程序 | 0.6% |
| 余额支付 | `BALANCE` | 所有场景 | 0% |

### 支付数据模型

```typescript
interface Payment {
  id: string;
  orderId: string;               // 关联订单ID
  paymentMethod: PaymentMethod;  // 支付方式
  amount: Decimal;               // 支付金额
  currency: string;              // 货币类型
  status: PaymentStatus;         // 支付状态
  transactionId?: string;        // 第三方交易号
  paymentUrl?: string;           // 支付URL（跳转支付）
  paidAt?: Date;                // 支付完成时间
  metadata?: object;             // 额外元数据
  createdAt: Date;
  updatedAt: Date;
}

enum PaymentMethod {
  ALIPAY  = 'ALIPAY',   // 支付宝
  WECHAT  = 'WECHAT',   // 微信支付
  BALANCE = 'BALANCE'   // 余额支付
}

enum PaymentStatus {
  PENDING   = 'PENDING',    // 待支付
  COMPLETED = 'COMPLETED',  // 已完成
  FAILED    = 'FAILED',     // 失败
  CANCELLED = 'CANCELLED',  // 已取消
  REFUNDED  = 'REFUNDED'    // 已退款
}
```

### 支付流程

#### 1. 支付宝支付流程

```typescript
// API: POST /api/payments
const createAlipayPayment = async (orderId: string) => {
  // 1. 验证订单
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderSolutions: true }
  });
  
  if (!order || order.status !== 'PENDING') {
    throw new Error('订单不可支付');
  }
  
  // 2. 创建支付记录
  const payment = await prisma.payment.create({
    data: {
      orderId,
      paymentMethod: 'ALIPAY',
      amount: order.totalAmount,
      currency: order.currency,
      status: 'PENDING'
    }
  });
  
  // 3. 调用支付宝API生成支付URL
  const alipayParams = {
    out_trade_no: order.orderNumber,
    total_amount: order.totalAmount.toString(),
    subject: `OpenAero订单-${order.orderNumber}`,
    body: order.orderSolutions
      .map(os => os.solution.title)
      .join(', '),
    notify_url: `${process.env.APP_URL}/api/payments/webhook/alipay`,
    return_url: `${process.env.APP_URL}/payment/success`
  };
  
  const paymentUrl = await alipaySDK.generatePaymentUrl(alipayParams);
  
  // 4. 更新支付记录
  await prisma.payment.update({
    where: { id: payment.id },
    data: { paymentUrl }
  });
  
  return { paymentUrl, paymentId: payment.id };
};
```

#### 2. 支付回调处理

```typescript
// API: POST /api/payments/webhook/alipay
export async function POST(request: NextRequest) {
  try {
    const params = await request.json();
    
    // 1. 验证签名
    const isValid = alipaySDK.verifySign(params);
    if (!isValid) {
      return NextResponse.json({ error: '签名验证失败' }, { status: 400 });
    }
    
    // 2. 提取参数
    const {
      out_trade_no: orderNumber,
      trade_no: transactionId,
      trade_status,
      total_amount
    } = params;
    
    // 3. 查找订单
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { paymentTransactions: true }
    });
    
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }
    
    // 4. 处理支付状态
    if (trade_status === 'TRADE_SUCCESS') {
      // 更新支付记录
      await prisma.payment.updateMany({
        where: {
          orderId: order.id,
          status: 'PENDING'
        },
        data: {
          status: 'COMPLETED',
          transactionId,
          paidAt: new Date()
        }
      });
      
      // 更新订单状态
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' }
      });
      
      // 触发订单处理流程
      await processOrder(order.id);
      
      // 发送通知
      await sendPaymentSuccessNotification(order);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    return NextResponse.json({ error: '处理失败' }, { status: 500 });
  }
}
```

#### 3. 微信支付流程

```typescript
// API: POST /api/payments/wechat
const createWechatPayment = async (orderId: string) => {
  const order = await getOrder(orderId);
  
  // 调用微信统一下单API
  const wechatParams = {
    appid: process.env.WECHAT_APPID,
    mch_id: process.env.WECHAT_MCH_ID,
    out_trade_no: order.orderNumber,
    body: `OpenAero订单-${order.orderNumber}`,
    total_fee: Math.round(order.totalAmount * 100), // 单位：分
    notify_url: `${process.env.APP_URL}/api/payments/webhook/wechat`,
    trade_type: 'NATIVE' // 扫码支付
  };
  
  const result = await wechatSDK.unifiedOrder(wechatParams);
  
  return {
    qrCodeUrl: result.code_url, // 二维码URL
    paymentId: payment.id
  };
};
```

#### 4. 余额支付流程

```typescript
// API: POST /api/payments/balance
const createBalancePayment = async (orderId: string) => {
  const user = await getServerUser();
  const order = await getOrder(orderId);
  
  // 1. 检查余额
  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id }
  });
  
  if (!wallet || wallet.balance < order.totalAmount) {
    throw new Error('余额不足');
  }
  
  // 2. 扣除余额（使用事务）
  await prisma.$transaction([
    // 扣除余额
    prisma.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: order.totalAmount } }
    }),
    
    // 创建支付记录
    prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'BALANCE',
        amount: order.totalAmount,
        currency: order.currency,
        status: 'COMPLETED',
        paidAt: new Date()
      }
    }),
    
    // 更新订单状态
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED' }
    }),
    
    // 记录钱包交易
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'PAYMENT',
        amount: -order.totalAmount,
        balance: wallet.balance - order.totalAmount,
        description: `支付订单 ${order.orderNumber}`,
        relatedOrderId: order.id
      }
    })
  ]);
  
  // 3. 触发订单处理
  await processOrder(order.id);
  
  return { success: true };
};
```

### 支付安全机制

#### 1. 签名验证

```typescript
// 支付宝签名验证
const verifyAlipaySign = (params: any): boolean => {
  const { sign, sign_type, ...data } = params;
  
  // 1. 按参数名排序
  const sortedParams = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');
  
  // 2. 使用公钥验证签名
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(sortedParams, 'utf8');
  
  return verify.verify(
    ALIPAY_PUBLIC_KEY,
    sign,
    'base64'
  );
};
```

#### 2. 防重放攻击

```typescript
// 检查回调是否已处理
const checkDuplicateCallback = async (transactionId: string) => {
  const existing = await prisma.payment.findFirst({
    where: { transactionId }
  });
  
  if (existing && existing.status === 'COMPLETED') {
    throw new Error('重复的支付回调');
  }
};
```

#### 3. 金额校验

```typescript
// 验证支付金额
const verifyAmount = (order: Order, paidAmount: number) => {
  if (Math.abs(order.totalAmount - paidAmount) > 0.01) {
    throw new Error('支付金额不匹配');
  }
};
```

---

## 退款系统

### 退款数据模型

```typescript
interface Refund {
  id: string;
  orderId: string;
  paymentId: string;
  amount: Decimal;              // 退款金额
  reason: string;               // 退款原因
  status: RefundStatus;         // 退款状态
  refundTransactionId?: string; // 第三方退款单号
  processedBy?: string;         // 处理人ID
  processedAt?: Date;          // 处理时间
  notes?: string;              // 处理备注
  createdAt: Date;
  updatedAt: Date;
}

enum RefundStatus {
  PENDING  = 'PENDING',   // 待处理
  APPROVED = 'APPROVED',  // 已批准
  REJECTED = 'REJECTED',  // 已拒绝
  COMPLETED = 'COMPLETED', // 已完成
  FAILED   = 'FAILED'     // 失败
}
```

### 退款流程

#### 步骤 1：申请退款

```typescript
// API: POST /api/orders/[id]/refund
const requestRefund = async (orderId: string, data: {
  reason: string;
  amount?: number;
}) => {
  const user = await getServerUser();
  const order = await getOrder(orderId);
  
  // 1. 验证权限
  if (order.userId !== user.id) {
    throw new Error('无权操作此订单');
  }
  
  // 2. 验证订单状态
  if (!['CONFIRMED', 'DELIVERED'].includes(order.status)) {
    throw new Error('订单状态不允许退款');
  }
  
  // 3. 查找支付记录
  const payment = await prisma.payment.findFirst({
    where: {
      orderId,
      status: 'COMPLETED'
    }
  });
  
  if (!payment) {
    throw new Error('未找到支付记录');
  }
  
  // 4. 创建退款申请
  const refund = await prisma.refund.create({
    data: {
      orderId,
      paymentId: payment.id,
      amount: data.amount || order.totalAmount,
      reason: data.reason,
      status: 'PENDING'
    }
  });
  
  // 5. 通知管理员
  await notifyAdminRefundRequest(refund);
  
  return refund;
};
```

#### 步骤 2：审核退款

```typescript
// API: PUT /api/admin/refunds/[id]
const processRefund = async (refundId: string, decision: {
  status: 'APPROVED' | 'REJECTED';
  notes?: string;
}) => {
  const admin = await requireAdminAuth();
  
  const refund = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: decision.status,
      processedBy: admin.id,
      processedAt: new Date(),
      notes: decision.notes
    },
    include: {
      order: true,
      payment: true
    }
  });
  
  // 如果批准，执行退款
  if (decision.status === 'APPROVED') {
    await executeRefund(refund);
  }
  
  return refund;
};
```

#### 步骤 3：执行退款

```typescript
const executeRefund = async (refund: Refund) => {
  const { payment, order } = refund;
  
  try {
    let refundResult;
    
    // 根据支付方式执行退款
    switch (payment.paymentMethod) {
      case 'ALIPAY':
        refundResult = await alipaySDK.refund({
          out_trade_no: order.orderNumber,
          refund_amount: refund.amount.toString(),
          refund_reason: refund.reason
        });
        break;
        
      case 'WECHAT':
        refundResult = await wechatSDK.refund({
          out_trade_no: order.orderNumber,
          out_refund_no: `RF${Date.now()}`,
          total_fee: Math.round(payment.amount * 100),
          refund_fee: Math.round(refund.amount * 100)
        });
        break;
        
      case 'BALANCE':
        // 余额退款：直接加回用户余额
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId: order.userId },
            data: { balance: { increment: refund.amount } }
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: order.user.walletId,
              type: 'REFUND',
              amount: refund.amount,
              description: `订单退款 ${order.orderNumber}`,
              relatedOrderId: order.id
            }
          })
        ]);
        break;
    }
    
    // 更新退款状态
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'COMPLETED',
        refundTransactionId: refundResult?.refund_id
      }
    });
    
    // 更新订单状态
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' }
    });
    
    // 通知用户
    await sendRefundSuccessNotification(order);
    
  } catch (error) {
    // 退款失败
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'FAILED',
        notes: error.message
      }
    });
    
    throw error;
  }
};
```

---

## 收益分成

### 分成规则

| 角色 | 分成比例 | 说明 |
|-----|---------|------|
| 创作者 | 70% | 方案销售收入 |
| 平台 | 30% | 平台服务费 |

### 收益数据模型

```typescript
interface Revenue {
  id: string;
  orderId: string;
  solutionId: string;
  creatorId: string;
  totalAmount: Decimal;        // 总金额
  creatorShare: Decimal;       // 创作者分成
  platformShare: Decimal;      // 平台分成
  status: RevenueStatus;       // 结算状态
  settledAt?: Date;           // 结算时间
  createdAt: Date;
}

enum RevenueStatus {
  PENDING     = 'PENDING',      // 待结算
  PROCESSING  = 'PROCESSING',   // 处理中
  SETTLED     = 'SETTLED',      // 已结算
  FAILED      = 'FAILED'        // 失败
}
```

### 收益计算

```typescript
// 订单支付成功后自动创建收益记录
const createRevenueRecords = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderSolutions: {
        include: { solution: true }
      }
    }
  });
  
  // 为每个方案创建收益记录
  for (const os of order.orderSolutions) {
    const totalAmount = os.subtotal;
    const platformRate = 0.30; // 30%平台服务费
    
    await prisma.revenue.create({
      data: {
        orderId: order.id,
        solutionId: os.solutionId,
        creatorId: os.solution.creatorId,
        totalAmount,
        creatorShare: totalAmount * (1 - platformRate),
        platformShare: totalAmount * platformRate,
        status: 'PENDING'
      }
    });
  }
};
```

### 提现流程

```typescript
// API: POST /api/creators/withdraw
const withdrawEarnings = async (amount: number) => {
  const user = await getServerUser();
  
  // 1. 查询可提现金额
  const availableRevenue = await prisma.revenue.aggregate({
    where: {
      creatorId: user.creatorProfile.id,
      status: 'SETTLED'
    },
    _sum: { creatorShare: true }
  });
  
  const withdrawn = await prisma.withdrawal.aggregate({
    where: {
      creatorId: user.creatorProfile.id,
      status: { in: ['PENDING', 'COMPLETED'] }
    },
    _sum: { amount: true }
  });
  
  const available = 
    (availableRevenue._sum.creatorShare || 0) - 
    (withdrawn._sum.amount || 0);
  
  if (amount > available) {
    throw new Error('提现金额超过可用余额');
  }
  
  // 2. 创建提现申请
  const withdrawal = await prisma.withdrawal.create({
    data: {
      creatorId: user.creatorProfile.id,
      amount,
      status: 'PENDING',
      bankAccount: user.creatorProfile.bankAccount // 从档案获取
    }
  });
  
  // 3. 提交到财务系统处理
  await submitToFinanceSystem(withdrawal);
  
  return withdrawal;
};
```

---

## 订单状态流转

### 状态转换规则

```typescript
const ORDER_STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
};

// 验证状态转换
const canTransition = (from: OrderStatus, to: OrderStatus): boolean => {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};
```

### 状态变更历史

```typescript
// 记录每次状态变更
const recordStatusChange = async (
  orderId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  changedBy?: string
) => {
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      changedAt: new Date()
    }
  });
};
```

---

## 安全机制

### 1. 幂等性保证

```typescript
// 使用订单号作为幂等键
const createOrderIdempotent = async (orderData: any, idempotencyKey: string) => {
  // 检查是否已存在相同幂等键的订单
  const existing = await redis.get(`order:${idempotencyKey}`);
  if (existing) {
    return JSON.parse(existing);
  }
  
  const order = await createOrder(orderData);
  
  // 缓存结果（24小时）
  await redis.setex(
    `order:${idempotencyKey}`,
    86400,
    JSON.stringify(order)
  );
  
  return order;
};
```

### 2. 并发控制

```typescript
// 使用乐观锁防止并发修改
const updateOrderWithLock = async (orderId: string, updates: any) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      updatedAt: order.updatedAt // 版本检查
    },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  });
  
  if (updated.count === 0) {
    throw new Error('订单已被修改，请重试');
  }
};
```

### 3. 支付超时处理

```typescript
// 定时任务：取消超时未支付订单
const cancelExpiredOrders = async () => {
  const expiredTime = new Date(Date.now() - 30 * 60 * 1000); // 30分钟
  
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: expiredTime }
    }
  });
  
  for (const order of expiredOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    });
  }
};
```

---

## API接口

### 订单API

```typescript
// 创建订单
POST /api/orders
Body: {
  items: [{ solutionId, quantity, price }],
  notes?: string
}

// 查询订单列表
GET /api/orders?page=1&limit=10&status=PENDING

// 查询订单详情
GET /api/orders/[id]

// 取消订单
POST /api/orders/[id]/cancel
```

### 支付API

```typescript
// 创建支付
POST /api/payments
Body: {
  orderId: string,
  paymentMethod: 'ALIPAY' | 'WECHAT' | 'BALANCE'
}

// 查询支付状态
GET /api/payments/status/[orderId]

// 支付回调（支付宝）
POST /api/payments/webhook/alipay

// 支付回调（微信）
POST /api/payments/webhook/wechat
```

### 退款API

```typescript
// 申请退款
POST /api/orders/[id]/refund
Body: {
  reason: string,
  amount?: number
}

// 审核退款（管理员）
PUT /api/admin/refunds/[id]
Body: {
  status: 'APPROVED' | 'REJECTED',
  notes?: string
}
```

---

## 最佳实践

### 订单处理

1. ✅ **及时确认订单**：支付成功后立即确认
2. ✅ **自动取消超时订单**：避免占用库存
3. ✅ **记录完整日志**：便于追踪和审计
4. ✅ **异步处理通知**：避免阻塞主流程

### 支付安全

1. ✅ **验证签名**：所有回调必须验签
2. ✅ **金额校验**：确保支付金额正确
3. ✅ **防重放**：检查交易ID唯一性
4. ✅ **HTTPS传输**：保护数据安全

### 退款管理

1. ✅ **明确退款政策**：7天无理由退款
2. ✅ **快速处理**：24小时内审核
3. ✅ **记录原因**：分析退款原因
4. ✅ **自动退款**：支持的支付方式自动退

---

## 故障处理

### 常见问题

#### Q1: 支付成功但订单未更新？
**原因**: 回调处理失败或延迟  
**解决**:
1. 检查支付回调日志
2. 手动触发对账
3. 使用支付查询API确认状态

#### Q2: 重复支付？
**原因**: 用户多次点击支付  
**解决**:
1. 前端防抖处理
2. 后端幂等性检查
3. 订单号唯一性约束

#### Q3: 退款失败？
**原因**: 第三方接口异常  
**解决**:
1. 重试机制（最多3次）
2. 手动退款兜底
3. 记录失败原因

### 监控告警

```typescript
// 监控支付成功率
const monitorPaymentSuccessRate = async () => {
  const stats = await prisma.payment.groupBy({
    by: ['status'],
    _count: true,
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });
  
  const total = stats.reduce((sum, s) => sum + s._count, 0);
  const success = stats.find(s => s.status === 'COMPLETED')?._count || 0;
  const rate = success / total;
  
  if (rate < 0.95) {
    // 触发告警
    await sendAlert({
      level: 'WARNING',
      message: `支付成功率过低: ${(rate * 100).toFixed(2)}%`
    });
  }
};
```

---

## 相关资源

- [API完整文档](./API_DOCUMENTATION.md)
- [数据库架构](./DATABASE_SCHEMA.md)
- [系统架构](./ARCHITECTURE.md)
- [方案工作流](./SOLUTION_WORKFLOW.md)

---

**文档维护**: OpenAero 技术团队  
**反馈渠道**: tech@openaero.com
