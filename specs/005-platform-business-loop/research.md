# Phase 0 Research: OpenAero平台商业闭环功能

**Branch**: `005-platform-business-loop` | **Date**: 2025-01-26 | **Spec**: [spec.md](./spec.md)

## Technical Context Resolution

Based on the OpenAero constitution, clarification decisions, and feature requirements, this research resolves all technical context items marked as "NEEDS CLARIFICATION" in the plan template.

### Language/Version
**Decision**: Node.js 18+ with TypeScript 5.0+
**Rationale**: 
- Constitution requirement: Node.js 18+ with Express.js
- TypeScript ensures type safety and better maintainability
- Aligns with existing OpenAero tech stack

### Primary Dependencies
**Decision**: 
- **Backend**: Express.js, Prisma ORM, Joi validation, bcrypt, jsonwebtoken
- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, Radix UI
- **Database**: PostgreSQL 15+, Redis for caching
- **File Processing**: multer, sharp (image processing), pdf-parse
**Rationale**: 
- Constitution mandates: Next.js 14+, TypeScript, Tailwind CSS, Radix UI, PostgreSQL, Redis
- Prisma provides type-safe database access with optimistic locking support
- Joi for robust input validation (security requirement)

### Storage
**Decision**: 
- **Database**: PostgreSQL 15+ (primary data)
- **File Storage**: Local file system with organized directory structure
- **Cache**: Redis for session management and temporary data
**Rationale**: 
- Clarification decision: "Option A - Local server storage, direct file system management"
- PostgreSQL supports JSONB for flexible metadata storage
- Local storage provides data control and predictable costs

### Testing
**Decision**: 
- **Backend**: Jest + Supertest for API testing
- **Frontend**: Jest + React Testing Library + Playwright for E2E
- **Database**: Separate test database with migrations
**Rationale**: 
- Constitution requirement: 90%+ test coverage, unit + integration tests
- Jest is standard for Node.js/TypeScript projects
- Playwright provides reliable E2E testing

### Target Platform
**Decision**: 
- **Primary**: Linux server (Ubuntu 22.04 LTS)
- **Frontend**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Mobile**: PWA with basic functionality (offline capability, app-like experience)
**Rationale**: 
- Constitution: Docker + Kubernetes deployment
- Clarification decision: "Basic PWA functionality"
- Linux server standard for Node.js applications

### Project Type
**Decision**: Web application (frontend + backend)
**Rationale**: 
- Feature requires both user interface and API services
- Multi-role system (creators, admins, customers)
- File upload and processing capabilities needed

### Performance Goals
**Decision**: 
- **API Response**: <200ms p95 for standard operations
- **File Upload**: Support up to 100MB files with progress tracking
- **Concurrent Users**: 1000+ simultaneous users
- **Database**: <50ms query response time p95
**Rationale**: 
- Constitution constraint: <200ms p95
- File uploads are core feature (CAD files, PDFs can be large)
- Business platform needs to handle multiple concurrent reviews

### Constraints
**Decision**: 
- **Memory**: <512MB per service instance
- **Storage**: Efficient file organization and cleanup
- **Security**: HTTPS only, input validation, file type restrictions
- **Offline**: Basic PWA offline capability for viewing submitted solutions
**Rationale**: 
- Constitution: HTTPS, security requirements
- Clarification: Basic PWA functionality
- Resource efficiency for cost control

### Scale/Scope
**Decision**: 
- **Users**: 10,000+ registered users (creators + customers)
- **Solutions**: 1,000+ submitted solutions with files
- **Files**: 10,000+ technical documents (PDFs, CAD, CSV)
- **Transactions**: 100+ daily payment transactions
**Rationale**: 
- Business platform targeting professional creators
- File-heavy workflow requires robust storage management
- Payment system indicates commercial scale

## Architecture Decisions

### 1. Microservices vs Monolith
**Decision**: Modular monolith with service separation
**Rationale**: 
- Constitution requires microservices architecture
- Start with modular monolith, extract services as needed
- Easier development and deployment for initial version

### 2. Authentication Strategy
**Decision**: JWT tokens with refresh token rotation
**Rationale**: 
- Stateless authentication for scalability
- Refresh tokens for security
- Supports role-based access control

### 3. File Processing Pipeline
**Decision**: Asynchronous processing with job queue
**Rationale**: 
- Large file uploads need background processing
- PDF parsing and validation can be time-consuming
- Better user experience with progress tracking

### 4. Payment Integration
**Decision**: Alipay/WeChat Pay SDK integration with webhook handling
**Rationale**: 
- Clarification decision: "集成支付宝/微信支付，自建收益分成系统"
- Webhook-based payment confirmation for reliability
- Custom revenue sharing logic

### 5. Database Schema Strategy
**Decision**: Optimistic locking with version fields
**Rationale**: 
- Clarification decision: "乐观锁+版本控制，事务冲突时重试"
- Prisma ORM supports optimistic locking natively
- Better performance than pessimistic locking

## Risk Assessment

### High Risk
1. **File Upload Security**: Malicious file uploads could compromise system
   - **Mitigation**: File type validation, virus scanning, sandboxed processing
2. **Payment Integration**: Complex webhook handling and error scenarios
   - **Mitigation**: Comprehensive testing, idempotent operations, manual reconciliation

### Medium Risk
1. **Concurrent Review Conflicts**: Multiple admins reviewing same solution
   - **Mitigation**: Optimistic locking, clear UI feedback on conflicts
2. **Large File Performance**: CAD files can be very large
   - **Mitigation**: Streaming uploads, progress tracking, file size limits

### Low Risk
1. **PWA Compatibility**: Different browser PWA support
   - **Mitigation**: Progressive enhancement, fallback to web app

## Next Steps

1. **Data Model Design**: Define database schema with relationships
2. **API Contract Definition**: OpenAPI specification for all endpoints
3. **Security Implementation**: Authentication, authorization, input validation
4. **File Processing Pipeline**: Upload, validation, storage workflow
5. **Payment Integration**: Alipay/WeChat Pay integration testing

## Constitution Compliance

✅ **标准化优先**: Node.js standard structure, TypeScript, environment variables
✅ **质量门禁**: Jest testing framework, 90%+ coverage target
✅ **国际化支持**: Next.js i18n, Chinese-first development
✅ **微服务架构**: Modular design with service separation
✅ **可观测性**: Structured logging, monitoring hooks prepared