import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    // 获取支付宝回调参数
    const tradeStatus = params.get('trade_status');
    const outTradeNo = params.get('out_trade_no'); // 订单号
    const tradeNo = params.get('trade_no'); // 支付宝交易号
    const totalAmount = params.get('total_amount');
    const buyerId = params.get('buyer_id');
    const gmtPayment = params.get('gmt_payment');
    const sign = params.get('sign');

    console.log('支付宝回调参数:', {
      tradeStatus,
      outTradeNo,
      tradeNo,
      totalAmount,
      buyerId,
      gmtPayment
    });

    // TODO: 验证签名
    // 在实际应用中，需要使用支付宝公钥验证签名
    if (!sign) {
      console.error('支付宝回调缺少签名');
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // 处理支付成功
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      if (!outTradeNo || !tradeNo) {
        console.error('支付宝回调缺少必要参数');
        return NextResponse.json({ success: false }, { status: 400 });
      }

      // TODO: 更新订单状态到数据库
      console.log(`订单 ${outTradeNo} 支付成功，支付宝交易号: ${tradeNo}`);
      
      // 模拟更新订单状态
      const updateResult = await updateOrderStatus(outTradeNo, 'paid', tradeNo);
      
      if (updateResult.success) {
        // TODO: 发送支付成功通知
        await sendPaymentNotification(outTradeNo, 'success');
        
        return NextResponse.json({ success: true });
      } else {
        console.error('更新订单状态失败:', updateResult.error);
        return NextResponse.json({ success: false }, { status: 500 });
      }
    }

    // 处理支付失败
    if (tradeStatus === 'TRADE_CLOSED') {
      if (outTradeNo) {
        await updateOrderStatus(outTradeNo, 'failed');
        await sendPaymentNotification(outTradeNo, 'failed');
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('处理支付宝回调失败:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// 模拟更新订单状态
async function updateOrderStatus(orderId: string, status: string, transactionId?: string) {
  try {
    // TODO: 实际实现中应该更新数据库
    console.log(`更新订单状态: ${orderId} -> ${status}`, transactionId ? `交易号: ${transactionId}` : '');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error };
  }
}

// 模拟发送支付通知
async function sendPaymentNotification(orderId: string, status: 'success' | 'failed') {
  try {
    // TODO: 实际实现中应该发送邮件或推送通知
    console.log(`发送支付通知: 订单 ${orderId} 支付${status === 'success' ? '成功' : '失败'}`);
    
    return { success: true };
  } catch (error) {
    console.error('发送支付通知失败:', error);
    return { success: false, error: error };
  }
}