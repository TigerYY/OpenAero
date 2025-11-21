## MODIFIED Requirements

### Requirement: Solution Review List
The system SHALL provide a list of solutions pending review and ready to publish for REVIEWER and ADMIN role users.

#### Scenario: Reviewer views pending review list
- **WHEN** a REVIEWER or ADMIN user calls `GET /api/admin/solutions?status=PENDING_REVIEW`
- **THEN** all solutions with status PENDING_REVIEW are returned
- **AND** solutions include creator information
- **AND** solutions are ordered by submittedAt ascending

#### Scenario: Admin views ready to publish list
- **WHEN** an ADMIN user calls `GET /api/admin/solutions?status=READY_TO_PUBLISH`
- **THEN** all solutions with status READY_TO_PUBLISH are returned
- **AND** solutions include optimization information
- **AND** solutions are ordered by optimizedAt descending

#### Scenario: Reviewer filters by category
- **WHEN** a REVIEWER user filters by category
- **THEN** only solutions in that category are returned

