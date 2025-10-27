# Data Model: OpenAero平台商业闭环功能

**Branch**: `005-platform-business-loop` | **Date**: 2025-01-26 | **Spec**: [spec.md](./spec.md)

## Database Schema Design

### Core Entities

#### 1. User (用户)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'pending',
    profile JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Profile fields (stored in JSONB for flexibility)
    -- {
    --   "name": "string",
    --   "company": "string", 
    --   "phone": "string",
    --   "avatar_url": "string",
    --   "bio": "string",
    --   "expertise": ["string"],
    --   "location": "string"
    -- }
);

CREATE TYPE user_role AS ENUM ('creator', 'customer', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

#### 2. Solution (解决方案)
```sql
CREATE TABLE solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    status solution_status NOT NULL DEFAULT 'draft',
    metadata JSONB NOT NULL DEFAULT '{}',
    pricing JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    
    -- Metadata fields
    -- {
    --   "technical_specs": {
    --     "flight_time": "number",
    --     "payload_capacity": "number", 
    --     "range": "number",
    --     "max_speed": "number"
    --   },
    --   "application_areas": ["string"],
    --   "complexity_level": "beginner|intermediate|advanced",
    --   "estimated_build_time": "string",
    --   "required_tools": ["string"]
    -- }
    
    -- Pricing fields
    -- {
    --   "base_price": "number",
    --   "currency": "CNY",
    --   "license_type": "personal|commercial|enterprise",
    --   "revenue_share": "number" // percentage for platform
    -- }
);

CREATE TYPE solution_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'needs_modification');

CREATE INDEX idx_solutions_creator ON solutions(creator_id);
CREATE INDEX idx_solutions_status ON solutions(status);
CREATE INDEX idx_solutions_category ON solutions(category);
CREATE INDEX idx_solutions_tags ON solutions USING GIN(tags);
CREATE INDEX idx_solutions_created_at ON solutions(created_at);
```

#### 3. Solution File (方案文件)
```sql
CREATE TABLE solution_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type file_type NOT NULL,
    file_size BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Metadata fields (file-type specific)
    -- {
    --   "pdf": {
    --     "pages": "number",
    --     "text_extracted": "boolean"
    --   },
    --   "cad": {
    --     "format": "step|iges|dwg",
    --     "parts_count": "number"
    --   },
    --   "bom": {
    --     "components_count": "number",
    --     "total_cost": "number"
    --   }
    -- }
);

CREATE TYPE file_type AS ENUM ('technical_doc', 'bom_list', 'cad_file', 'image', 'video', 'other');

CREATE INDEX idx_solution_files_solution ON solution_files(solution_id);
CREATE INDEX idx_solution_files_type ON solution_files(file_type);
```

#### 4. Review (审核记录)
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID NOT NULL REFERENCES solutions(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status review_status NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 5),
    comments TEXT,
    feedback JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    
    -- Feedback fields
    -- {
    --   "technical_quality": "number", // 1-5
    --   "documentation_quality": "number", // 1-5
    --   "innovation": "number", // 1-5
    --   "market_potential": "number", // 1-5
    --   "required_changes": ["string"],
    --   "strengths": ["string"],
    --   "concerns": ["string"]
    -- }
);

CREATE TYPE review_status AS ENUM ('in_progress', 'approved', 'rejected', 'needs_modification');

CREATE INDEX idx_reviews_solution ON reviews(solution_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
```

#### 5. Order (订单)
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id),
    solution_id UUID NOT NULL REFERENCES solutions(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    payment_method VARCHAR(50),
    payment_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    
    -- Payment details
    -- {
    --   "alipay": {
    --     "trade_no": "string",
    --     "buyer_id": "string"
    --   },
    --   "wechat": {
    --     "transaction_id": "string",
    --     "openid": "string"
    --   }
    -- }
);

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'delivered', 'cancelled', 'refunded');

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_solution ON orders(solution_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
```

#### 6. Payment Transaction (支付交易)
```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    payment_provider VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    status payment_status NOT NULL DEFAULT 'pending',
    provider_response JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1
);

CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');

CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(payment_provider);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

#### 7. Revenue Share (收益分成)
```sql
CREATE TABLE revenue_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    platform_share DECIMAL(10,2) NOT NULL,
    creator_share DECIMAL(10,2) NOT NULL,
    platform_percentage DECIMAL(5,2) NOT NULL,
    status share_status NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

CREATE TYPE share_status AS ENUM ('pending', 'processed', 'failed');

CREATE INDEX idx_revenue_shares_order ON revenue_shares(order_id);
CREATE INDEX idx_revenue_shares_creator ON revenue_shares(creator_id);
CREATE INDEX idx_revenue_shares_status ON revenue_shares(status);
```

### Supporting Tables

#### 8. User Sessions (用户会话)
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
```

#### 9. Email Verification (邮箱验证)
```sql
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL,
    type verification_type NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE verification_type AS ENUM ('registration', 'password_reset', 'email_change');

CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
```

#### 10. Audit Log (审计日志)
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## Relationships and Constraints

### Primary Relationships
1. **User → Solution**: One-to-many (creator relationship)
2. **Solution → Solution Files**: One-to-many (file attachments)
3. **Solution → Reviews**: One-to-many (review history)
4. **User → Orders**: One-to-many (customer purchases)
5. **Solution → Orders**: One-to-many (solution sales)
6. **Order → Payment Transactions**: One-to-many (payment attempts)
7. **Order → Revenue Shares**: One-to-one (revenue distribution)

### Business Rules
1. **Solution Status Flow**: draft → pending_review → (approved|rejected|needs_modification)
2. **Order Status Flow**: pending → paid → processing → delivered
3. **Payment Status Flow**: pending → processing → (completed|failed)
4. **Revenue Share**: Automatically calculated when order status becomes 'paid'
5. **File Constraints**: Maximum 100MB per file, specific MIME types allowed
6. **Review Requirements**: Only admin users can create reviews

## Optimistic Locking Strategy

All main entities include a `version` field for optimistic locking:

```sql
-- Example update with version check
UPDATE solutions 
SET title = $1, description = $2, updated_at = NOW(), version = version + 1
WHERE id = $3 AND version = $4;

-- If affected rows = 0, handle conflict (retry or error)
```

## Indexing Strategy

### Performance Indexes
- **User lookups**: email, role, status
- **Solution queries**: creator_id, status, category, tags, created_at
- **File management**: solution_id, file_type
- **Review workflow**: solution_id, reviewer_id, status
- **Order processing**: customer_id, solution_id, status, order_number
- **Payment tracking**: order_id, payment_provider, status
- **Revenue reporting**: creator_id, status

### Full-text Search
```sql
-- Add full-text search for solutions
ALTER TABLE solutions ADD COLUMN search_vector tsvector;

CREATE INDEX idx_solutions_search ON solutions USING GIN(search_vector);

-- Update trigger for search vector
CREATE OR REPLACE FUNCTION update_solution_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solution_search_vector
    BEFORE INSERT OR UPDATE ON solutions
    FOR EACH ROW EXECUTE FUNCTION update_solution_search_vector();
```

## Data Migration Strategy

### Initial Setup
1. Create database and user with appropriate permissions
2. Run schema creation scripts in dependency order
3. Create indexes and constraints
4. Set up triggers and functions
5. Insert initial admin user and basic data

### Version Control
- Use database migration files (e.g., Prisma migrations)
- Each schema change gets a timestamped migration file
- Support rollback for critical changes
- Test migrations on staging environment first

## Security Considerations

### Data Protection
- Password hashing with bcrypt (minimum 12 rounds)
- Sensitive data encryption at rest
- PII data handling compliance
- File upload validation and scanning

### Access Control
- Row-level security for multi-tenant data
- Role-based access control (RBAC)
- API rate limiting per user/IP
- Audit logging for sensitive operations

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Encrypted backup storage
- Regular restore testing