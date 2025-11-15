
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  requireAdminAuth,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
} from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { createSupabaseAdmin } from '@/lib/auth/supabase-client';

export const dynamic = 'force-dynamic';

// Zod schema for query parameters validation
const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['USER', 'CREATOR', 'REVIEWER', 'FACTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// Main GET handler for fetching users
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and authorize admin
    const authResult = await requireAdminAuth(request);
    if (!authResult.success) {
      return authResult.response || createErrorResponse('权限验证失败', 401);
    }

    // 2. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = getUsersQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }

    const { page, limit, role, status, search, dateFrom, dateTo } = validationResult.data;

    // 3. Fetch ALL users from Supabase Auth (the single source of truth)
    const supabaseAdmin = createSupabaseAdmin();
    let allAuthUsers = [];
    let nextPageToken: string | null = null;

    do {
      const { data: authUsersBatch, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, pageToken: nextPageToken });
      if (authError) {
        console.error('从 Supabase 获取用户时出错:', authError);
        throw new Error('无法从认证服务获取用户列表');
      }
      allAuthUsers.push(...authUsersBatch.users);
      nextPageToken = authUsersBatch.nextPageToken ?? null;
    } while (nextPageToken);

    const authUserIds = allAuthUsers.map(u => u.id);

    // 4. Fetch corresponding profiles from Prisma, keyed by ID for quick lookup
    const profiles = await prisma.userProfile.findMany({
      where: { user_id: { in: authUserIds } },
    });
    const profilesMap = new Map(profiles.map(p => [p.user_id, p]));

    // 5. Merge Auth users with local profiles and apply filters IN MEMORY
    let mergedUsers = allAuthUsers.map(authUser => {
      const profile = profilesMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || '',
        roles: profile?.roles || ['USER'], // Default to USER role if no profile
        status: profile?.status || 'ACTIVE',
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        emailVerified: !!authUser.email_confirmed_at,
        createdAt: authUser.created_at,
        updatedAt: profile?.updated_at || authUser.updated_at,
        lastLoginAt: authUser.last_sign_in_at,
        // Add counts if available, otherwise default to 0
        solutionCount: 0, 
        reviewCount: 0,
      };
    });

    // Apply filters
    if (search) {
      const lowercasedSearch = search.toLowerCase();
      mergedUsers = mergedUsers.filter(u => 
        u.email.toLowerCase().includes(lowercasedSearch) ||
        u.firstName?.toLowerCase().includes(lowercasedSearch) ||
        u.lastName?.toLowerCase().includes(lowercasedSearch)
      );
    }
    if (role) {
      mergedUsers = mergedUsers.filter(u => u.roles.includes(role));
    }
    if (status) {
      mergedUsers = mergedUsers.filter(u => u.status === status);
    }
    if (dateFrom) {
      mergedUsers = mergedUsers.filter(u => new Date(u.createdAt) >= dateFrom);
    }
    if (dateTo) {
      mergedUsers = mergedUsers.filter(u => new Date(u.createdAt) <= dateTo);
    }

    // 6. Manually paginate the filtered results
    const totalUsers = mergedUsers.length;
    const paginatedUsers = mergedUsers.slice((page - 1) * limit, page * limit);

    // 7. Return the paginated response
    return createPaginatedResponse(
      paginatedUsers,
      page,
      limit,
      totalUsers,
      '成功获取用户列表'
    );

  } catch (error) {
    console.error('获取用户列表失败:', error);
    return createErrorResponse(error instanceof Error ? error.message : '获取用户列表时发生未知错误', 500);
  }
}
