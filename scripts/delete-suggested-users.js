// 自动生成的用户删除脚本
// 生成时间: 2025/11/12 16:46:54

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToDelete = [
  "dde13ba3-53c3-4e5c-aec5-24c71cbc0c38",
  "87172f18-7218-41ed-a6ee-b57d84a04d60",
  "c8f2cca4-9d3d-4df7-ab37-eabbe9446f86",
  "36427835-69fc-442d-983a-f903c73233b8",
  "401afd8f-611d-43b8-abfd-7a8c16f720cb"
];

async function deleteUsers() {
  console.log('准备删除 ' + usersToDelete.length + ' 个用户...');
  
  for (const userId of usersToDelete) {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.error('❌ 删除失败:', userId, error);
      } else {
        console.log('✅ 已删除:', userId);
      }
    } catch (err) {
      console.error('❌ 错误:', err);
    }
  }
  
  console.log('\n清理完成！');
}

deleteUsers();
