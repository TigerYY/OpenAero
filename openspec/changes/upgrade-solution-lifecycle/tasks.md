## 1. Database Migration

- [x] 1.1 Add READY_TO_PUBLISH and SUSPENDED to SolutionStatus enum in Prisma schema
- [x] 1.2 Create SolutionPublishing model (独立表存储商品化数据)
  - [x] 1.2.1 Add solution_id (unique foreign key to Solution)
  - [x] 1.2.2 Add publishing fields (publish_description, media_links, product_links)
  - [x] 1.2.3 Add SEO fields (meta_title, meta_description, meta_keywords)
  - [x] 1.2.4 Add featured fields (featured_tags, featured_order, is_featured)
  - [x] 1.2.5 Add statistics fields (view_count, download_count, like_count)
  - [x] 1.2.6 Add optimization tracking (optimized_at, optimized_by, optimization_notes)
- [x] 1.3 Add upgrade-related fields to Solution model (upgraded_from_id, upgraded_from_version, upgrade_notes, is_upgrade)
- [x] 1.4 Create database migration script
- [ ] 1.5 Test migration script in development environment
  - [x] 1.5.1 Create migration test script
  - [x] 1.5.2 Create API test script
  - [x] 1.5.3 Create test documentation
- [x] 1.6 Create rollback script

## 2. Backend API - Publishing Optimization

- [x] 2.1 Create `PUT /api/admin/solutions/[id]/optimize` endpoint
  - [x] 2.1.1 Create or update SolutionPublishing record
  - [x] 2.1.2 Handle upsert logic (create if not exists, update if exists)
- [x] 2.2 Implement optimization data validation (media_links, product_links format)
- [x] 2.3 Implement product link validation (check product existence)
- [x] 2.4 Update solution status to READY_TO_PUBLISH after optimization
- [x] 2.5 Create `GET /api/admin/solutions/[id]/preview` endpoint
  - [x] 2.5.1 Include SolutionPublishing data in response
  - [x] 2.5.2 Merge Solution and SolutionPublishing data for preview
- [x] 2.6 Update `POST /api/solutions/[id]/publish` to support READY_TO_PUBLISH → PUBLISHED transition
- [x] 2.7 Update `POST /api/solutions/[id]/publish` to support PUBLISHED → SUSPENDED transition
- [x] 2.8 Update `POST /api/solutions/[id]/publish` to support SUSPENDED → PUBLISHED transition
- [x] 2.9 Update status transition validation logic

## 3. Backend API - Batch Operations

- [x] 3.1 Create `POST /api/admin/solutions/batch-publish` endpoint
- [x] 3.2 Create `POST /api/admin/solutions/batch-suspend` endpoint
- [x] 3.3 Create `POST /api/admin/solutions/batch-restore` endpoint
- [x] 3.4 Implement batch operation transaction handling
- [x] 3.5 Implement batch operation limit (max 10 solutions)
- [x] 3.6 Implement batch operation error handling and reporting

## 4. Backend API - Solution Upgrade

- [x] 4.1 Create `POST /api/solutions/[id]/upgrade` endpoint
- [x] 4.2 Implement upgrade permission validation (CREATOR can upgrade own + published, ADMIN can upgrade any)
- [x] 4.3 Implement upgrade data copying (basic info, specs, features, tags)
- [x] 4.4 Implement optional asset copying (upgradeAssets option)
- [x] 4.5 Implement optional BOM copying (upgradeBom option)
- [x] 4.6 Implement upgrade relationship tracking
- [x] 4.7 Create `GET /api/solutions/[id]/upgrade-history` endpoint
- [x] 4.8 Implement upgrade rate limiting (5 per day per creator)

## 5. Backend API - Status Management

- [x] 5.1 Update `GET /api/admin/solutions` to support READY_TO_PUBLISH status filter
  - [x] 5.1.1 Include SolutionPublishing data in response (if exists)
- [x] 5.2 Update `GET /api/admin/solutions` to support SUSPENDED status filter
- [x] 5.3 Update `GET /api/solutions/mine` to support new status filters
- [x] 5.4 Update `GET /api/solutions/[id]` to include SolutionPublishing data for public view
  - [x] 5.4.1 Merge Solution and SolutionPublishing data
  - [x] 5.4.2 Use SolutionPublishing data if exists, fallback to Solution defaults
- [x] 5.5 Update status transition validation in all relevant endpoints

## 6. Frontend - Publishing Optimization Page

- [x] 6.1 Create `/zh-CN/admin/solutions/[id]/optimize` page
- [x] 6.2 Create `MediaLinkEditor` component (集成在页面中)
- [x] 6.3 Create `ProductLinkSelector` component (集成在页面中)
- [x] 6.4 Create `SEOOptimizer` component (集成在页面中)
- [x] 6.5 Create `PublishPreview` component (集成在页面中)
- [x] 6.6 Implement optimization form with validation
- [x] 6.7 Implement preview functionality
- [x] 6.8 Implement save optimization (status → READY_TO_PUBLISH)
- [x] 6.9 Implement direct publish (skip preview)

## 7. Frontend - Publishing Management Page

- [x] 7.1 Create `/zh-CN/admin/solutions/publish-management` page
- [x] 7.2 Implement solution list with READY_TO_PUBLISH status filter
- [x] 7.3 Implement batch selection functionality
- [x] 7.4 Create `BatchPublishToolbar` component (集成在页面中)
- [x] 7.5 Implement batch publish action
- [x] 7.6 Implement batch suspend action
- [x] 7.7 Implement batch restore action
- [x] 7.8 Implement individual solution actions (preview, optimize, publish, cancel)

## 8. Frontend - Review Workbench Updates

- [x] 8.1 Add "准备发布" (Ready to Publish) tab to review workbench
- [x] 8.2 Update status filter to include READY_TO_PUBLISH and SUSPENDED
- [x] 8.3 Update `SolutionStatusBadge` component to support new statuses
- [x] 8.4 Add "优化" button for APPROVED solutions
- [x] 8.5 Add "发布" button for READY_TO_PUBLISH solutions
- [x] 8.6 Add "恢复" button for SUSPENDED solutions

## 9. Frontend - Solution Upgrade

- [x] 9.1 Create `UpgradeSolutionDialog` component
- [x] 9.2 Add "升级" button to solution list (creator's own solutions + published solutions)
- [x] 9.3 Add "升级" button to solution detail page
- [x] 9.4 Implement upgrade form (title, upgrade options, upgrade notes)
- [x] 9.5 Implement upgrade API call
- [x] 9.6 Implement upgrade success handling (redirect to edit page)
- [x] 9.7 Display upgrade relationship on solution detail page
- [x] 9.8 Display upgrade history on solution detail page

## 10. Frontend - Solution Card Updates

- [x] 10.1 Update `SolutionCard` component to support new statuses
- [x] 10.2 Add upgrade button to solution cards (where applicable)
- [x] 10.3 Update status badge display for READY_TO_PUBLISH and SUSPENDED

## 11. Frontend - Public Solution Display

- [x] 11.1 Update public solution detail page to display optimization data (media links, product links, SEO)
- [x] 11.2 Display upgrade relationship if solution is upgraded
- [x] 11.3 Display upgrade history if solution has been upgraded

## 12. Testing

- [ ] 12.1 Write unit tests for status transition validation
- [ ] 12.2 Write unit tests for upgrade logic
- [ ] 12.3 Write unit tests for batch operations
- [ ] 12.4 Write integration tests for optimization flow
- [ ] 12.5 Write integration tests for upgrade flow
- [ ] 12.6 Write E2E tests for admin optimization and publishing flow
- [ ] 12.7 Write E2E tests for creator upgrade flow
- [ ] 12.8 Write E2E tests for batch operations

## 13. Documentation

- [ ] 13.1 Update `solution-complete-lifecycle.md` with new states and flows
- [ ] 13.2 Update API documentation
- [ ] 13.3 Create admin user manual (optimization and publishing)
- [ ] 13.4 Create creator user manual (upgrade functionality)
- [ ] 13.5 Update database schema documentation

## 14. Deployment

- [ ] 14.1 Backup production database
- [ ] 14.2 Execute database migration in production
- [ ] 14.3 Deploy backend API changes
- [ ] 14.4 Deploy frontend changes
- [ ] 14.5 Verify deployment
- [ ] 14.6 Monitor for errors

