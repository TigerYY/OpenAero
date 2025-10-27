import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // 简单解析微信支付回调的XML数据
    const parseXmlValue = (xml: string, tag: string): string | null => {
      const regex = new RegExp(`<${tag}><\\!\\[CDATA\\[(.+?)\\]\\]></${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    // 获取微信支付回调参数
    const returnCode = parseXmlValue(body, 'return_code') || null;
    const returnMsg = parseXmlValue(body, 'return_msg') || null;
    const resultCode = parseXmlValue(body, 'result_code') || null;
    const outTradeNo = parseXmlValue(body, 'out_trade_no') || null; // 订单号
    const transactionId = parseXmlValue(body, 'transaction_id') || null; // 微信支付交易号
    const totalFee = parseXmlValue(body, 'total_fee') || null; // 支付金额（分）
    const timeEnd = parseXmlValue(body, 'time_end') || null;
    const openid = parseXmlValue(body, 'openid');
    const sign = parseXmlValue(body, 'sign');

    console.log('微信支付回调参数:', {
      returnCode,
      resultCode,
      outTradeNo,
      transactionId,
      totalFee,
      openid,
      timeEnd
    });

    // 验证回调数据
    if (returnCode !== 'SUCCESS') {
      console.error('微信支付回调失败:', parseXmlValue(body, 'return_msg'));
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[回调数据错误]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // TODO: 验证签名
    // 在实际应用中，需要使用微信支付密钥验证签名
    if (!sign) {
      console.error('微信支付回调缺少签名');
      return new NextResponse(
        '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[缺少签名]]></return_msg></xml>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // 处理支付成功
    if (resultCode === 'SUCCESS') {
      if (!outTradeNo || !transactionId) {
        console.error('微信支付回调缺少必要参数');
        return new NextResponse(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[缺少必要参数]]></return_msg></xml>',
          { 
            status: 400,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
      }

      // TODO: 更新订单状态到数据库
      console.log(`订单 ${outTradeNo} 支付成功，微信交易号: ${transactionId}`);
      
      // 模拟更新订单状态
      const updateResult = await updateOrderStatus(outTradeNo, 'paid', transactionId);
      
      if (updateResult.success) {
        // TODO: 发送支付成功通知
        await sendPaymentNotification(outTradeNo, 'success');
        
        return new NextResponse(
          '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
          { 
            status: 200,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
      } else {
        console.error('更新订单状态失败:', updateResult.error);
        return new NextResponse(
          '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[更新订单失败]]></return_msg></xml>',
          { 
            status: 500,
            headers: { 'Content-Type': 'application/xml' }
          }
        );
      }
    }

    // 处理支付失败
    if (resultCode === 'FAIL') {
      if (outTradeNo) {
        await updateOrderStatus(outTradeNo, 'failed');
        await sendPaymentNotification(outTradeNo, 'failed');
      }
    }

    return new NextResponse(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      { 
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      }
    );

  } catch (error) {
    console.error('处理微信支付回调失败:', error);
    return new NextResponse(
      '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>',
      { 
        status: 500,
        headers: { 'Content-Type': 'application/xml' }
      }
    );
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