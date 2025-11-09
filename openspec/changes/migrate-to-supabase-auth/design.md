# Design: Migration to Supabase Auth

## Architecture Overview

### Current State
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend     │───▶│  Custom Auth API │───▶│ Supabase DB     │
│ (AuthClient)   │    │  (/api/auth/*)   │    │ (users table)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
localStorage Sessions      Custom Logic          PostgreSQL Data
```

### Target State
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend     │───▶│  Supabase Auth   │───▶│ Supabase DB     │
│(Supabase Auth) │    │  Email Service   │    │ (auth.users)    │
│   Provider     │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
JWT Tokens           Email Auth Only       Built-in User Data
```

### Backend Architecture (Preserved)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Frontend Auth  │───▶│ Existing Backend │───▶│ Existing DB     │
│ (Supabase Auth) │    │     APIs         │    │   Schema        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Migration Strategy

### Phase 1: Supabase Auth Setup
**Goal**: Enable Supabase Auth with email-only configuration

**Technical Approach**:
1. Configure Supabase Auth for email authentication
2. Set up official email service (support@openaero.cn)
3. Configure email templates for verification and reset
4. Disable OAuth providers in Supabase dashboard
5. Test email authentication flows in parallel

**Email Service Configuration**:
```typescript
const emailConfig = {
  from: 'support@openaero.cn',
  smtp: {
    host: 'smtp.exmail.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@openaero.cn',
      pass: 'zdM469e7q3ZU2gy7'
    }
  }
};
```

**Risk Mitigation**:
- Feature flag to switch between auth systems
- Maintain existing backend API during testing
- Comprehensive email testing before user-facing changes

### Phase 2: Data Migration
**Goal**: Migrate user data from custom table to auth.users

**Migration Mapping**:
```sql
-- Current users table (preserved)
users {
  id: text (UUID)
  email: text
  name: text
  role: text
  email_verified: boolean
  created_at: timestamp
  updated_at: timestamp
}

-- New auth.users + metadata
auth.users {
  id: uuid
  email: text
  email_confirmed_at: timestamp
  created_at: timestamp
  updated_at: timestamp
  user_metadata: {
    first_name: text
    last_name: text
    role: text
    original_id: text (for rollback)
  }
}
```

**Migration Process**:
1. Create migration script preserving original users table
2. Backup existing user data
3. Run data transformation to auth.users
4. Verify data integrity
5. Test email authentication with migrated users

### Phase 3: Frontend Auth Replacement
**Goal**: Replace frontend authentication with Supabase Auth SDK

**API Mapping** (Frontend Only):
```
Custom AuthClient    → supabase.auth.signInWithPassword()
Custom AuthClient    → supabase.auth.signUp()
Custom AuthClient    → supabase.auth.signOut()
Custom AuthClient    → supabase.auth.getSession()
Custom AuthClient    → supabase.auth.resetPasswordForEmail()
```

**Implementation Strategy**:
1. Update frontend to use SupabaseAuthProvider
2. Replace AuthClient calls with Supabase SDK methods
3. Remove OAuth-related UI components
4. **Preserve existing backend API endpoints**
5. Update frontend middleware to use Supabase sessions

### Phase 4: Cleanup
**Goal**: Remove redundant frontend auth code and optimize

**Cleanup Tasks**:
1. Remove custom AuthClient class
2. Delete OAuth-related UI components
3. Remove unused authentication middleware (frontend only)
4. Update frontend tests and documentation
5. **Preserve backend authentication logic**

## Technical Considerations

### Session Management
**Current Frontend**: localStorage with custom session objects
**Target Frontend**: Supabase JWT tokens with automatic refresh
**Backend**: Continue existing session management

```typescript
// Before (Frontend)
const session = AuthClient.getSession();
const authHeader = AuthClient.getAuthHeader();

// After (Frontend)
const { data: { session } } = await supabase.auth.getSession();
const authHeader = session ? { Authorization: `Bearer ${session.access_token}` } : {};

// Backend (Unchanged)
const authHeader = req.headers.authorization;
```

### User Roles & Permissions
**Approach**: Use Supabase user_metadata for custom fields, sync with existing users table

```typescript
// User metadata structure
{
  first_name: string;
  last_name: string;
  role: 'USER' | 'CREATOR' | 'ADMIN';
  avatar_url?: string;
  original_id: string; // Reference to preserved users table
}
```

### Email Service Integration
**Configuration**:
```typescript
// Email template configuration
const emailTemplates = {
  confirmation: {
    subject: '验证您的 OpenAero 账户',
    from: 'support@openaero.cn'
  },
  reset_password: {
    subject: '重置您的 OpenAero 密码',
    from: 'support@openaero.cn'
  }
};
```

### OAuth Exclusion
**Explicitly Disabled**:
- No Google OAuth integration
- No GitHub OAuth integration  
- No third-party social login buttons
- Remove OAuth-related UI components

### Error Handling
**Strategy**: Centralized error handling with user-friendly messages

```typescript
// Auth error mapping (email-focused)
const mapAuthError = (error: AuthError) => {
  switch (error.message) {
    case 'Invalid login credentials':
      return '邮箱或密码不正确';
    case 'Email not confirmed':
      return '请先验证您的邮箱';
    case 'User already registered':
      return '该邮箱已被注册';
    default:
      return '认证失败，请稍后重试';
  }
};
```

## Testing Strategy

### Migration Testing
1. **Data Integrity**: Verify all users migrate correctly to auth.users
2. **Email Authentication**: Test login with migrated accounts
3. **Email Verification**: Test verification using support@openaero.cn
4. **Password Reset**: Test reset email functionality
5. **Backend Continuity**: Ensure existing APIs still function

### Regression Testing
1. **Email Flows**: Registration, verification, password reset
2. **Backend Functions**: All existing API endpoints
3. **Database Operations**: Preserved schema functionality
4. **OAuth Exclusion**: Verify no OAuth functionality exists
5. **Email Services**: Verification, reset emails via exmail.qq.com

## Rollback Plan

### Immediate Rollback (Phase 1-2)
- Feature flag to revert to custom frontend auth
- Database backups for auth.users restoration
- Frontend component restoration

### Full Rollback (Any Phase)
- Restore auth.users from backup
- Revert frontend code changes
- Switch authentication via feature flag
- Backend remains unchanged (no rollback needed)

## Monitoring & Success Metrics

### Key Metrics
- Email authentication success rate (>99.5%)
- Email delivery rate via exmail.qq.com (>98%)
- Frontend auth response time (<200ms)
- User migration completion rate (100%)
- OAuth exclusion verification (0% OAuth usage)

### Monitoring Setup
- Supabase dashboard metrics for auth
- Email delivery monitoring via exmail.qq.com
- Frontend performance monitoring
- Backend API continuity monitoring
- User feedback collection on email flows