/**
 * 使用SQL创建超级管理员档案
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

async function createSuperAdmin() {
  try {
    const userEmail = 'openaero.iot@gmail.com';
    const userId = 'dffd7c4e-a40d-4b85-bb13-e30d732e509c';

    console.log('🔧 使用SQL创建超级管理员档案...\n');

    // 使用SQL直接插入
    const sql = `
      INSERT INTO public.user_profiles (user_id, role, status, created_at, updated_at) 
      VALUES ('${userId}', 'SUPER_ADMIN', 'ACTIVE', NOW(), NOW()) 
      ON CONFLICT (user_id) DO UPDATE SET 
        role = 'SUPER_ADMIN', 
        status = 'ACTIVE', 
        updated_at = NOW()
      RETURNING *;
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ SQL执行失败:', error);
      
      // 尝试直接使用SQL字符串
      console.log('\n尝试替代方案...');
      
      const { data: altData, error: altError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (altError) {
        console.error('❌ 替代方案也失败:', altError);
        return;
      }

      console.log('✅ 替代方案成功！');
      console.log('超级管理员档案创建/更新成功');
    } else {
      console.log('✅ SQL执行成功！');
      console.log('超级管理员档案:', data);
    }

    // 验证结果
    console.log('\n🎉 超级管理员设置完成！');
    console.log(`   邮箱: ${userEmail}`);
    console.log(`   角色: SUPER_ADMIN`);
    console.log('   ⭐ 超级管理员 - 拥有所有权限\n');

  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

createSuperAdmin();