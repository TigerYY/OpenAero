// 设备管理API路由

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-config';
import { deviceManager } from '@/lib/device-manager';

// 获取用户设备列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const devices = await deviceManager.getUserDevices(session.user.id);

    return NextResponse.json({
      success: true,
      data: devices,
    });

  } catch (error) {
    console.error('获取设备列表失败:', error);
    return NextResponse.json(
      { error: '获取设备列表失败' },
      { status: 500 }
    );
  }
}

// 注册新设备
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      deviceName,
      deviceType,
      userAgent,
      ipAddress,
      location,
      fingerprint
    } = body;

    const device = await deviceManager.registerDevice(session.user.id, {
      deviceName,
      deviceType,
      ipAddress,
      location,
      fingerprint,
    });

    return NextResponse.json({
      success: true,
      data: device,
    });

  } catch (error) {
    console.error('注册设备失败:', error);
    return NextResponse.json(
      { error: '注册设备失败' },
      { status: 500 }
    );
  }
}

// 删除设备
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: '缺少设备ID' },
        { status: 400 }
      );
    }

    await deviceManager.revokeDevice(deviceId);

    return NextResponse.json({
      success: true,
      message: '设备已删除',
    });

  } catch (error) {
    console.error('删除设备失败:', error);
    return NextResponse.json(
      { error: '删除设备失败' },
      { status: 500 }
    );
  }
}