# Migration to Supabase Auth Service

## Summary
Replace the current self-built authentication system with Supabase's native Auth service to improve security, reduce maintenance overhead, and provide enhanced email-based authentication features.

## Why
The current project maintains a complex dual authentication approach that creates security risks, maintenance burden, and development inefficiency. By migrating to Supabase Auth, we can:
- **Eliminate security vulnerabilities** in self-built authentication code
- **Reduce maintenance overhead** by leveraging Supabase's managed auth service
- **Improve user experience** with standardized email authentication flows
- **Gain enterprise-grade email authentication** with email verification and password reset
- **Focus development resources** on core business logic rather than auth infrastructure
- **Maintain existing backend architecture** while only replacing frontend authentication layer

## What Changes
- Replace custom AuthClient class with Supabase Auth SDK for frontend authentication
- Implement email-based registration and login using Supabase Auth
- Configure official email service (support@openaero.cn via exmail.qq.com)
- Update frontend components to use SupabaseAuthProvider
- Remove OAuth-related functionality (Google, GitHub verification)
- Disable or remove third-party authentication UI components
- **Preserve existing backend data architecture and API interfaces**
- **Maintain current database schema for business logic**

## Problem Statement
The current project maintains a dual authentication approach:
1. Self-built authentication APIs with custom session management
2. Supabase Auth provider components (partially implemented with unnecessary OAuth features)

This creates complexity, security risks, and maintenance burden while duplicating functionality that Supabase provides out-of-the-box. Additionally, unnecessary OAuth features add complexity without business value.

## Proposed Solution
Migrate to Supabase Auth service with email-only authentication in 4 phases:
1. **Phase 1**: Enable and configure Supabase Auth with email service
2. **Phase 2**: Migrate existing user data to Supabase auth.users
3. **Phase 3**: Replace frontend authentication with Supabase Auth SDK
4. **Phase 4**: Clean up redundant auth code and OAuth components

## Benefits
- **Enhanced Security**: Enterprise-grade email authentication with built-in security features
- **Reduced Complexity**: Single source of truth for email authentication
- **Simplified Architecture**: Remove unnecessary OAuth complexity
- **Email Service Integration**: Official support@openaero.cn email configuration
- **Lower Maintenance**: Supabase manages authentication infrastructure
- **Backend Continuity**: Preserve existing data architecture and APIs
- **Improved User Experience**: Standardized email authentication flows

## Scope
- Email-based user authentication and authorization
- Session management via Supabase Auth
- Email verification using support@openaero.cn
- Password reset functionality
- Data migration from custom users table to auth.users
- Frontend authentication component replacement
- Removal of OAuth-related UI components and functionality

## Out of Scope
- Backend data architecture changes (preserve existing schema)
- API interface modifications (maintain current endpoints)
- OAuth providers (Google, GitHub) - explicitly excluded
- Business logic changes
- Database schema changes beyond authentication
- Third-party integrations not related to email auth

## Email Service Configuration
- **Email**: support@openaero.cn
- **Password**: zdM469e7q3ZU2gy7
- **IMAP Server**: imap.exmail.qq.com:993
- **SMTP Server**: smtp.exmail.qq.com:465
- **Service Provider**: Tencent Exmail (企业邮箱)

## Success Criteria
- All existing users can successfully authenticate with email via Supabase Auth
- Email verification and password reset function using support@openaero.cn
- No OAuth functionality in frontend (removed or disabled)
- Backend data architecture and APIs remain unchanged
- No data loss during migration
- All authentication-related tests pass
- Performance is maintained or improved