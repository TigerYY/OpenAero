/**
 * 创建超级管理员档案脚本
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误: 缺少 Supabase 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdminProfile() {
  try {
    const userEmail = 'openaero.iot@gmail.com';
    const userId = 'dffd7c4e-a40d-4b85-bb13-e30d732e509c';

    console.log('🔧 创建超级管理员档案...\n');

    // 检查是否已存在
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      console.log('⚠️  用户档案已存在，更新角色为超级管理员...');
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ 更新失败:', updateError);
        return;
      }
      
      console.log('✅ 角色更新成功！');
    } else {
      console.log('📝 创建新的超级管理员档案...');
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ 创建失败:', insertError);
        return;
      }
      
      console.log('✅ 档案创建成功！');
    }

    // 验证创建结果
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      console.log('\n📋 超级管理员档案信息:');
      console.log(`   ID: ${profile.id}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   角色: ${profile.role}`);
      console.log(`   状态: ${profile.status}`);
      console.log(`   创建时间: ${profile.created_at}`);
    }

    console.log('\n🎉 超级管理员设置完成！');
    console.log(`   邮箱: ${userEmail}`);
    console.log(`   角色: SUPER_ADMIN`);
    console.log('   ⭐ 超级管理员 - 拥有所有权限\n');

  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

createSuperAdminProfile();