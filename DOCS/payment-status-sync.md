# 支付状态同步系统文档

## 概述

支付状态同步系统用于定期查询第三方支付平台（支付宝、微信支付）的支付状态，并将状态同步到本地数据库。这确保了即使webhook回调失败，支付状态也能及时更新。

## 功能特性

1. **自动状态查询**：定期查询待支付和处理中的支付记录
2. **状态同步**：将第三方支付状态同步到本地数据库
3. **订单更新**：支付成功后自动更新订单状态
4. **收益分成**：支付成功后自动处理收益分成
5. **事件记录**：记录所有状态变更事件

## 架构设计

### 核心服务

- **`src/lib/payment/payment-status-sync.ts`**：支付状态同步核心服务
  - `queryAlipayStatus()`：查询支付宝支付状态
  - `queryWechatStatus()`：查询微信支付状态
  - `syncPaymentStatus()`：同步单个支付状态
  - `syncPendingPayments()`：批量同步支付状态

### API端点

1. **`GET /api/payments/[id]/status`**：查询支付状态（自动同步）
   - 如果支付状态为`PROCESSING`或`PENDING`，会自动触发状态同步

2. **`POST /api/payments/sync`**：手动触发支付状态同步
   - 需要管理员权限
   - 支持单个支付同步或批量同步
   - 请求体：
     ```json
     {
       "paymentId": "payment-id", // 可选，指定支付ID
       "limit": 50 // 可选，批量同步数量限制（默认50）
     }
     ```

3. **`GET /api/payments/sync`**：获取同步统计信息
   - 需要管理员权限
   - 返回待同步的支付数量

4. **`GET /api/cron/payments-sync`**：定时任务端点
   - 需要Bearer Token认证（`CRON_SECRET`）
   - 每10分钟执行一次（Vercel Cron配置）

## 配置

### 环境变量

需要在`.env`文件中配置以下环境变量：

```bash
# 支付宝配置
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key
ALIPAY_PUBLIC_KEY=your-alipay-public-key

# 微信支付配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-wechat-merchant-id
WECHAT_PAY_KEY=your-wechat-pay-key

# 定时任务配置
CRON_SECRET=your-cron-secret-key
```

### Vercel Cron配置

在`vercel.json`中配置定时任务：

```json
{
  "crons": [
    {
      "path": "/api/cron/payments-sync",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

这将在每10分钟执行一次支付状态同步。

## 使用方式

### 手动触发同步

#### 单个支付同步

```bash
curl -X POST https://your-domain.com/api/payments/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "paymentId": "payment-id"
  }'
```

#### 批量同步

```bash
curl -X POST https://your-domain.com/api/payments/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "limit": 50
  }'
```

### 查询同步统计

```bash
curl -X GET https://your-domain.com/api/payments/sync \
  -H "Authorization: Bearer your-admin-token"
```

### 定时任务调用

```bash
curl -X GET https://your-domain.com/api/cron/payments-sync \
  -H "Authorization: Bearer your-cron-secret"
```

## 状态映射

### 支付宝状态映射

| 支付宝状态 | 本地状态 |
|-----------|---------|
| TRADE_SUCCESS | COMPLETED |
| TRADE_FINISHED | COMPLETED |
| TRADE_CLOSED | CANCELLED |
| WAIT_BUYER_PAY | PENDING |
| TRADE_PENDING | PROCESSING |
| 其他 | FAILED |

### 微信支付状态映射

| 微信支付状态 | 本地状态 |
|------------|---------|
| SUCCESS | COMPLETED |
| CLOSED | CANCELLED |
| NOTPAY | PENDING |
| 其他 | FAILED |

## 同步逻辑

1. **查询范围**：只同步状态为`PROCESSING`或`PENDING`的支付记录
2. **时间限制**：只同步24小时内创建的支付记录
3. **状态更新**：只有当第三方状态与本地状态不一致时才更新
4. **订单更新**：支付成功后自动更新订单状态为`CONFIRMED`
5. **收益分成**：支付成功后自动处理收益分成

## 错误处理

- 如果第三方API调用失败，会记录错误日志但不影响其他支付记录的处理
- 如果支付记录不存在或缺少必要信息，会跳过该记录
- 所有错误都会记录到审计日志中

## 监控和日志

- 所有同步操作都会记录到日志中
- 状态变更会创建`PaymentEvent`记录
- 管理员可以通过审计日志查看同步历史

## 注意事项

1. **API调用频率**：注意第三方支付平台的API调用频率限制
2. **安全性**：确保`CRON_SECRET`足够复杂，不要泄露
3. **性能**：批量同步时注意数据库性能，建议每次不超过50条
4. **幂等性**：同步操作是幂等的，可以安全地重复执行

## 故障排查

### 同步失败

1. 检查环境变量配置是否正确
2. 检查第三方支付平台的API凭证是否有效
3. 查看日志文件了解具体错误信息

### 定时任务不执行

1. 检查`vercel.json`配置是否正确
2. 检查Vercel项目是否已部署
3. 检查`CRON_SECRET`是否正确配置

### 状态不同步

1. 检查支付记录是否有`externalId`
2. 检查支付状态是否为`PROCESSING`或`PENDING`
3. 检查支付记录创建时间是否在24小时内

