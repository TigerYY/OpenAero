## MODIFIED Requirements

### Requirement: Solution Publishing
The system SHALL allow ADMIN role users to publish approved solutions through a two-stage process: optimization and publishing.

#### Scenario: Admin optimizes approved solution
- **WHEN** an ADMIN user calls `PUT /api/admin/solutions/:id/optimize` with optimization data
- **AND** the solution status is APPROVED
- **THEN** the solution status changes to READY_TO_PUBLISH
- **AND** a SolutionPublishing record is created or updated (upsert)
- **AND** optimization data (publish_description, media_links, product_links, SEO fields) is saved in SolutionPublishing table
- **AND** the optimized_at timestamp is set in SolutionPublishing
- **AND** the optimized_by field is set to the admin user ID in SolutionPublishing

#### Scenario: Admin publishes ready-to-publish solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=PUBLISH
- **AND** the solution status is READY_TO_PUBLISH
- **THEN** the solution status changes to PUBLISHED
- **AND** the published_at timestamp is set
- **AND** the solution becomes visible to all users
- **AND** a SolutionReview record is created with fromStatus=READY_TO_PUBLISH, toStatus=PUBLISHED

#### Scenario: Cannot publish non-ready solution
- **WHEN** an ADMIN user attempts to publish a solution with status APPROVED
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the solution must be optimized first

### Requirement: Solution Archiving
The system SHALL allow ADMIN role users to archive or suspend published solutions.

#### Scenario: Admin suspends published solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=SUSPEND
- **AND** the solution status is PUBLISHED
- **THEN** the solution status changes to SUSPENDED
- **AND** the solution is no longer visible to public users
- **AND** the published_at timestamp is preserved
- **AND** a SolutionReview record is created with fromStatus=PUBLISHED, toStatus=SUSPENDED

#### Scenario: Admin restores suspended solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=RESTORE
- **AND** the solution status is SUSPENDED
- **THEN** the solution status changes to PUBLISHED
- **AND** the solution becomes visible to all users again
- **AND** the published_at timestamp remains unchanged
- **AND** a SolutionReview record is created with fromStatus=SUSPENDED, toStatus=PUBLISHED

#### Scenario: Admin archives published solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=ARCHIVE
- **AND** the solution status is PUBLISHED
- **THEN** the solution status changes to ARCHIVED
- **AND** the archived_at timestamp is set
- **AND** the solution is no longer visible to public users
- **AND** a SolutionReview record is created with fromStatus=PUBLISHED, toStatus=ARCHIVED

#### Scenario: Cannot archive non-published solution
- **WHEN** an ADMIN user attempts to archive a solution with status DRAFT
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the solution must be published first

## ADDED Requirements

### Requirement: Solution Publishing Optimization
The system SHALL allow ADMIN role users to optimize solutions before publishing.

#### Scenario: Admin adds publish description
- **WHEN** an ADMIN user optimizes a solution with publish_description
- **THEN** the publish_description is saved in SolutionPublishing table
- **AND** it is displayed on the public solution detail page
- **AND** if SolutionPublishing does not exist, it is created

#### Scenario: Admin adds media links
- **WHEN** an ADMIN user optimizes a solution with media_links array
- **AND** each link includes type (VIDEO, DEMO, TUTORIAL, DOCUMENTATION, OTHER), title, url, and optional thumbnail
- **THEN** all media links are saved in SolutionPublishing table
- **AND** they are displayed on the public solution detail page

#### Scenario: Admin links products
- **WHEN** an ADMIN user optimizes a solution with product_links array
- **AND** each link includes productId, productName, productSku, productUrl, relationType (REQUIRED, RECOMMENDED, OPTIONAL), and optional description
- **THEN** all product links are saved in SolutionPublishing table
- **AND** the product existence is validated
- **AND** they are displayed on the public solution detail page

#### Scenario: Admin sets SEO fields
- **WHEN** an ADMIN user optimizes a solution with meta_title, meta_description, and meta_keywords
- **THEN** all SEO fields are saved in SolutionPublishing table
- **AND** they are used in the solution's meta tags
- **AND** they override Solution table defaults if SolutionPublishing exists

#### Scenario: Admin sets featured status
- **WHEN** an ADMIN user optimizes a solution with is_featured=true and featured_order
- **THEN** the solution is marked as featured in SolutionPublishing table
- **AND** it appears in featured solutions list
- **AND** it is ordered by featured_order

### Requirement: Solution Publishing Preview
The system SHALL allow ADMIN role users to preview how a solution will appear when published.

#### Scenario: Admin previews optimized solution
- **WHEN** an ADMIN user calls `GET /api/admin/solutions/:id/preview`
- **AND** the solution status is READY_TO_PUBLISH
- **THEN** the complete solution data is returned
- **AND** Solution and SolutionPublishing data are merged
- **AND** SolutionPublishing data takes precedence over Solution defaults
- **AND** all optimization data is included
- **AND** the preview shows how it will appear to public users

### Requirement: Batch Publishing Operations
The system SHALL allow ADMIN role users to perform batch publishing operations.

#### Scenario: Admin batch publishes solutions
- **WHEN** an ADMIN user calls `POST /api/admin/solutions/batch-publish` with solutionIds array
- **AND** all solutions have status READY_TO_PUBLISH
- **AND** the array contains at most 10 solution IDs
- **THEN** all solutions are published in a transaction
- **AND** each solution status changes to PUBLISHED
- **AND** a success count and failure details are returned

#### Scenario: Admin batch suspends solutions
- **WHEN** an ADMIN user calls `POST /api/admin/solutions/batch-suspend` with solutionIds array
- **AND** all solutions have status PUBLISHED
- **AND** the array contains at most 10 solution IDs
- **THEN** all solutions are suspended in a transaction
- **AND** each solution status changes to SUSPENDED

#### Scenario: Admin batch restores solutions
- **WHEN** an ADMIN user calls `POST /api/admin/solutions/batch-restore` with solutionIds array
- **AND** all solutions have status SUSPENDED
- **AND** the array contains at most 10 solution IDs
- **THEN** all solutions are restored in a transaction
- **AND** each solution status changes to PUBLISHED

#### Scenario: Batch operation exceeds limit
- **WHEN** an ADMIN user attempts a batch operation with more than 10 solution IDs
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the limit is 10

### Requirement: Solution Status Transition Validation
The system SHALL enforce valid status transitions according to the updated state machine.

#### Scenario: Valid status transitions
- **WHEN** a status change is requested
- **THEN** the system validates the transition is allowed
- **AND** only the following transitions are permitted:
  - DRAFT → PENDING_REVIEW (submit)
  - PENDING_REVIEW → APPROVED (review approve)
  - PENDING_REVIEW → REJECTED (review reject)
  - PENDING_REVIEW → PENDING_REVIEW (needs revision, decision only)
  - APPROVED → READY_TO_PUBLISH (optimize)
  - READY_TO_PUBLISH → PUBLISHED (publish)
  - READY_TO_PUBLISH → APPROVED (revert optimization)
  - PUBLISHED → SUSPENDED (suspend)
  - SUSPENDED → PUBLISHED (restore)
  - PUBLISHED → ARCHIVED (archive)
  - REJECTED → PENDING_REVIEW (resubmit)

#### Scenario: Invalid status transition
- **WHEN** an invalid status transition is attempted
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the transition is not allowed

### Requirement: Public Solution Display with Publishing Data
The system SHALL merge Solution and SolutionPublishing data when displaying published solutions to public users.

#### Scenario: Public user views published solution list
- **WHEN** any user calls `GET /api/solutions?status=PUBLISHED`
- **THEN** only solutions with status PUBLISHED are returned
- **AND** solutions are ordered by publishedAt descending
- **AND** each solution includes SolutionPublishing data if exists (merged with Solution data)
- **AND** SolutionPublishing data (publish_description, media_links, product_links, SEO) takes precedence over Solution defaults

#### Scenario: Public user views solution details with publishing data
- **WHEN** any user calls `GET /api/solutions/:id` for a PUBLISHED solution
- **AND** a SolutionPublishing record exists
- **THEN** Solution and SolutionPublishing data are merged
- **AND** SolutionPublishing data (publish_description, media_links, product_links, SEO fields) takes precedence
- **AND** all optimization data is displayed
- **AND** technical specifications from Solution are included
- **AND** BOM items and assets from Solution are included

#### Scenario: Public user views solution without publishing data
- **WHEN** any user calls `GET /api/solutions/:id` for a PUBLISHED solution
- **AND** no SolutionPublishing record exists
- **THEN** only Solution data is returned
- **AND** solution is displayed with default values

