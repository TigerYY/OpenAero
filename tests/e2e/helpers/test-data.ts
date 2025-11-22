/**
 * E2E 测试数据
 */

export const testUsers = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@openaero.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123456',
  },
  creator: {
    email: process.env.E2E_CREATOR_EMAIL || 'creator@openaero.test',
    password: process.env.E2E_CREATOR_PASSWORD || 'creator123456',
  },
  user: {
    email: process.env.E2E_USER_EMAIL || 'user@openaero.test',
    password: process.env.E2E_USER_PASSWORD || 'user123456',
  },
};

export const testSolutions = {
  published: {
    title: '测试已发布方案',
    description: '这是一个用于测试的已发布方案',
  },
  readyToPublish: {
    title: '测试准备发布方案',
    description: '这是一个用于测试的准备发布方案',
  },
  draft: {
    title: '测试草稿方案',
    description: '这是一个用于测试的草稿方案',
  },
};

