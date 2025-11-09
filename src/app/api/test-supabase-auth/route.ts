/**
 * Supabase Auth测试API
 * 简化版本，测试基本的Supabase认证功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { featureFlags } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  try {
    // 基本配置验证
    const validation = {
      isValid: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      errors: [],
      warnings: [],
      recommendations: []
    };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      validation.errors.push('Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      validation.errors.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      validation.errors.push('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    // 测试数据库连接
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    let dbConnection = false;
    let userTableExists = false;
    let authService = false;
    
    try {
      // 测试数据库连接
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST116') {
          dbConnection = true;
          userTableExists = false;
        } else {
          dbConnection = false;
        }
      } else {
        dbConnection = true;
        userTableExists = true;
      }
      
      // 测试认证服务
      const { data: authData, error: authError } = await supabase.auth.getSession();
      authService = authError?.message !== 'Invalid JWT' && authError?.message !== 'No session';
      
    } catch (error) {
      dbConnection = false;
      authService = false;
    }
    
    // 获取功能标志
    const flags = featureFlags.getFlags();
    
    const response = {
      timestamp: new Date().toISOString(),
      configuration: {
        validation,
        database: {
          connected: dbConnection,
          userTableExists,
        },
        auth: {
          serviceAvailable: authService,
        },
        featureFlags: flags,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSMTP: !!process.env.SMTP_HOST,
      },
      recommendations: [
        ...validation.recommendations,
        ...(!dbConnection ? ['数据库连接失败，请检查连接字符串'] : []),
        ...(!userTableExists ? ['用户表不存在，请执行迁移脚本'] : []),
        ...(!authService ? ['认证服务可能未启用'] : []),
        ...(flags.useSupabaseAuth ? [] : ['可以设置FEATURE_SUPABASE_AUTH=true启用Supabase Auth']),
      ],
      nextSteps: [
        '1. 在Supabase Dashboard中启用Authentication',
        '2. 配置站点URL和重定向URL',
        '3. 执行数据库迁移脚本',
        '4. 测试用户注册和登录功能',
      ],
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test Supabase Auth configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'test-email': {
        // 测试邮件功能
        const { email } = body;
        if (!email) {
          return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
        });

        if (error) {
          return NextResponse.json({ 
            error: 'Email test failed',
            details: error.message 
          }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true,
          message: 'Test email sent successfully' 
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}