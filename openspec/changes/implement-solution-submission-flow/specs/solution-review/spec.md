## ADDED Requirements

### Requirement: Solution Review List
The system SHALL provide a list of solutions pending review for REVIEWER and ADMIN role users.

#### Scenario: Reviewer views pending review list
- **WHEN** a REVIEWER or ADMIN user calls `GET /api/admin/solutions?status=PENDING_REVIEW`
- **THEN** all solutions with status PENDING_REVIEW are returned
- **AND** solutions include creator information
- **AND** solutions are ordered by submittedAt ascending

#### Scenario: Reviewer filters by category
- **WHEN** a REVIEWER user filters by category
- **THEN** only solutions in that category are returned

### Requirement: Solution Review Detail View
The system SHALL provide detailed information about a solution for review.

#### Scenario: Reviewer views solution details
- **WHEN** a REVIEWER user calls `GET /api/solutions/:id` for a PENDING_REVIEW solution
- **THEN** all solution information is returned
- **AND** technical specifications (technicalSpecs) are formatted for display
- **AND** architecture diagrams (architecture field) are included
- **AND** BOM items (SolutionBomItem or JSON bom) with product references are shown
- **AND** all assets (SolutionAsset or SolutionFile) are available for preview

### Requirement: Solution Review Approval
The system SHALL allow REVIEWER and ADMIN role users to approve solutions.

#### Scenario: Reviewer approves solution
- **WHEN** a REVIEWER user calls `PUT /api/admin/solutions/:id/review` with decision=APPROVED
- **AND** the solution status is PENDING_REVIEW
- **THEN** the solution status changes to APPROVED
- **AND** the existing SolutionReview record is updated with fromStatus=PENDING_REVIEW, toStatus=APPROVED
- **OR** a new SolutionReview record is created if none exists
- **AND** the reviewerId is recorded
- **AND** the review comment is saved
- **AND** the lastReviewedAt timestamp is updated on Solution

#### Scenario: Reviewer approves with scores
- **WHEN** a REVIEWER user approves with quality, completeness, innovation, and market potential scores
- **THEN** all scores are recorded in the SolutionReview record
- **AND** an average score is calculated

### Requirement: Solution Review Rejection
The system SHALL allow REVIEWER and ADMIN role users to reject solutions.

#### Scenario: Reviewer rejects solution
- **WHEN** a REVIEWER user calls `PUT /api/admin/solutions/:id/review` with decision=REJECTED
- **AND** a comment is provided (comments or decisionNotes)
- **AND** the solution status is PENDING_REVIEW
- **THEN** the solution status changes to REJECTED
- **AND** the existing SolutionReview record is updated with fromStatus=PENDING_REVIEW, toStatus=REJECTED
- **OR** a new SolutionReview record is created if none exists
- **AND** the rejection comment is saved
- **AND** the creator can modify and resubmit

#### Scenario: Rejection requires comment
- **WHEN** a REVIEWER user attempts to reject without a comment
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates a comment is required

### Requirement: Solution Review History
The system SHALL maintain a complete history of all review actions for a solution.

#### Scenario: View review history
- **WHEN** a user requests review history for a solution
- **THEN** all SolutionReview records are returned
- **AND** records are ordered by createdAt descending
- **AND** each record includes reviewer information, status transition, and comments

#### Scenario: Creator views review history
- **WHEN** a CREATOR user views their solution's review history
- **THEN** they can see all review decisions and comments
- **AND** they can see why their solution was rejected or approved

### Requirement: Review Permission Validation
The system SHALL enforce that only REVIEWER and ADMIN role users can review solutions.

#### Scenario: Non-reviewer cannot review
- **WHEN** a USER or CREATOR role user attempts to review a solution
- **THEN** the system returns a 403 Forbidden error
- **AND** the error message indicates insufficient permissions

#### Scenario: Reviewer can review
- **WHEN** a REVIEWER role user attempts to review
- **THEN** the review action is allowed
- **AND** the review is recorded

### Requirement: Review Status Validation
The system SHALL enforce that only PENDING_REVIEW solutions can be reviewed.

#### Scenario: Cannot review non-pending solution
- **WHEN** a REVIEWER attempts to review a solution with status APPROVED
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the solution is not in reviewable state

