## ADDED Requirements

### Requirement: Solution Draft Creation
The system SHALL allow CREATOR role users to create solution drafts.

#### Scenario: Creator creates new draft
- **WHEN** a CREATOR user calls `POST /api/solutions`
- **THEN** a new Solution with status DRAFT is created
- **AND** the creatorId is set to the current user's creator profile ID
- **AND** the solution is associated with the creator

#### Scenario: Creator creates draft with minimal data
- **WHEN** a CREATOR user creates a draft with only title and description
- **THEN** the draft is created successfully
- **AND** other fields can be filled later

### Requirement: Solution Draft Editing
The system SHALL allow CREATOR role users to edit solution drafts and rejected solutions.

#### Scenario: Creator edits draft
- **WHEN** a CREATOR user calls `PUT /api/solutions/:id` with status DRAFT
- **THEN** the solution fields are updated
- **AND** the updatedAt timestamp is updated

#### Scenario: Creator edits rejected solution
- **WHEN** a CREATOR user calls `PUT /api/solutions/:id` with status REJECTED
- **THEN** the solution fields are updated
- **AND** the solution can be resubmitted for review

#### Scenario: Creator cannot edit pending review solution
- **WHEN** a CREATOR user attempts to edit a solution with status PENDING_REVIEW
- **THEN** the system returns a 403 Forbidden error
- **AND** an error message indicates the solution is under review

### Requirement: Solution BOM Management
The system SHALL allow CREATOR role users to manage BOM (Bill of Materials) items for solutions.

#### Scenario: Creator updates BOM
- **WHEN** a CREATOR user calls `PUT /api/solutions/:id/bom` with BOM items array
- **THEN** existing BOM items are deleted
- **AND** new BOM items are created
- **AND** each BOM item can optionally reference a Product ID

#### Scenario: BOM item with product reference
- **WHEN** a CREATOR user adds a BOM item with productId
- **THEN** the BOM item is linked to the Product
- **AND** the product reference is validated to exist

### Requirement: Solution Asset Management
The system SHALL allow CREATOR role users to upload and manage assets (images, documents, videos, CAD files) for solutions.

#### Scenario: Creator uploads asset
- **WHEN** a CREATOR user uploads a file to Supabase Storage
- **AND** calls `POST /api/solutions/:id/assets` with asset metadata
- **THEN** a SolutionAsset record is created
- **AND** the asset type (IMAGE, DOCUMENT, VIDEO, CAD, OTHER) is recorded

#### Scenario: Creator uploads multiple assets
- **WHEN** a CREATOR user uploads multiple files
- **THEN** multiple SolutionAsset records are created
- **AND** each asset is associated with the solution

### Requirement: Solution Submission for Review
The system SHALL allow CREATOR role users to submit solutions for review.

#### Scenario: Creator submits draft for review
- **WHEN** a CREATOR user calls `POST /api/solutions/:id/submit` with status DRAFT
- **AND** all required fields are complete (title, description, category)
- **AND** at least one asset exists (SolutionAsset or SolutionFile)
- **THEN** the solution status changes to PENDING_REVIEW
- **AND** the submittedAt timestamp is set
- **AND** a SolutionReview record is created with fromStatus=DRAFT, toStatus=PENDING_REVIEW
- **AND** the review record includes reviewerId (system or creator ID for submission)

#### Scenario: Creator resubmits rejected solution
- **WHEN** a CREATOR user calls `POST /api/solutions/:id/submit` with status REJECTED
- **AND** the solution has been modified
- **THEN** the solution status changes to PENDING_REVIEW
- **AND** a new SolutionReview record is created

#### Scenario: Submission validation fails
- **WHEN** a CREATOR user attempts to submit a solution with missing required fields
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message lists missing fields

#### Scenario: Submission requires at least one asset
- **WHEN** a CREATOR user attempts to submit a solution with no assets
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates assets are required

### Requirement: Solution Draft Auto-Save
The system SHALL automatically save solution drafts periodically.

#### Scenario: Draft auto-saves during editing
- **WHEN** a CREATOR user is editing a solution draft
- **AND** 2 seconds pass without changes
- **THEN** the draft is automatically saved
- **AND** no user action is required

### Requirement: Creator Solution List
The system SHALL provide a list of solutions for the current CREATOR user.

#### Scenario: Creator views solution list
- **WHEN** a CREATOR user calls `GET /api/solutions/mine`
- **THEN** all solutions created by the user are returned
- **AND** solutions are ordered by updatedAt descending
- **AND** each solution includes status, title, updatedAt, and review count

#### Scenario: Creator filters solutions by status
- **WHEN** a CREATOR user requests solutions with status=DRAFT
- **THEN** only draft solutions are returned

