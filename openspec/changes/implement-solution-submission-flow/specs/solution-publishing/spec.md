## ADDED Requirements

### Requirement: Solution Publishing
The system SHALL allow ADMIN role users to publish approved solutions.

#### Scenario: Admin publishes approved solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=PUBLISH
- **AND** the solution status is APPROVED
- **THEN** the solution status changes to PUBLISHED
- **AND** the publishedAt timestamp is set
- **AND** the solution becomes visible to all users
- **AND** a SolutionReview record is created with fromStatus=APPROVED, toStatus=PUBLISHED

#### Scenario: Cannot publish non-approved solution
- **WHEN** an ADMIN user attempts to publish a solution with status DRAFT
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the solution must be approved first

### Requirement: Solution Archiving
The system SHALL allow ADMIN role users to archive published solutions.

#### Scenario: Admin archives published solution
- **WHEN** an ADMIN user calls `POST /api/solutions/:id/publish` with action=ARCHIVE
- **AND** the solution status is PUBLISHED
- **THEN** the solution status changes to ARCHIVED
- **AND** the archivedAt timestamp is set
- **AND** the solution is no longer visible to public users
- **AND** a SolutionReview record is created with fromStatus=PUBLISHED, toStatus=ARCHIVED

#### Scenario: Cannot archive non-published solution
- **WHEN** an ADMIN user attempts to archive a solution with status DRAFT
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the solution must be published first

### Requirement: Public Solution List
The system SHALL provide a public list of published solutions.

#### Scenario: Public user views published solutions
- **WHEN** any user calls `GET /api/solutions?status=PUBLISHED`
- **THEN** only solutions with status PUBLISHED are returned
- **AND** solutions are ordered by publishedAt descending
- **AND** each solution includes title, summary, category, tags, and creator information

#### Scenario: Public user cannot see non-published solutions
- **WHEN** a public user requests solutions
- **THEN** solutions with status DRAFT, PENDING_REVIEW, APPROVED, REJECTED, or ARCHIVED are excluded
- **AND** only PUBLISHED solutions are returned

### Requirement: Public Solution Detail View
The system SHALL provide a public detail view for published solutions.

#### Scenario: Public user views solution details
- **WHEN** any user calls `GET /api/solutions/:id` for a PUBLISHED solution
- **THEN** all solution information is returned
- **AND** technical specifications are formatted for display
- **AND** architecture diagrams are shown
- **AND** BOM items with product links are displayed
- **AND** all assets are available for viewing

#### Scenario: Public user cannot view non-published solution
- **WHEN** a public user attempts to view a solution with status DRAFT
- **THEN** the system returns a 404 Not Found error
- **AND** the solution is not accessible

#### Scenario: Creator can view own non-published solution
- **WHEN** a CREATOR user views their own solution with status DRAFT
- **THEN** the solution details are returned
- **AND** the creator can edit the solution

### Requirement: Publishing Permission Validation
The system SHALL enforce that only ADMIN role users can publish or archive solutions.

#### Scenario: Non-admin cannot publish
- **WHEN** a CREATOR or REVIEWER user attempts to publish a solution
- **THEN** the system returns a 403 Forbidden error
- **AND** the error message indicates admin privileges are required

#### Scenario: Admin can publish
- **WHEN** an ADMIN user attempts to publish
- **THEN** the publish action is allowed
- **AND** the status change is recorded

### Requirement: Solution Status Transition Validation
The system SHALL enforce valid status transitions according to the state machine.

#### Scenario: Valid status transitions
- **WHEN** a status change is requested
- **THEN** the system validates the transition is allowed
- **AND** only the following transitions are permitted:
  - DRAFT → PENDING_REVIEW (submit)
  - PENDING_REVIEW → APPROVED (review approve)
  - PENDING_REVIEW → REJECTED (review reject)
  - APPROVED → PUBLISHED (publish)
  - PUBLISHED → ARCHIVED (archive)
  - REJECTED → PENDING_REVIEW (resubmit)

#### Scenario: Invalid status transition
- **WHEN** an invalid status transition is attempted
- **THEN** the system returns a 400 Bad Request error
- **AND** the error message indicates the transition is not allowed

