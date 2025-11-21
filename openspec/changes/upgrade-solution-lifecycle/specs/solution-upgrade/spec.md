## ADDED Requirements

### Requirement: Solution Upgrade Creation
The system SHALL allow CREATOR role users to create upgraded versions of existing solutions.

#### Scenario: Creator upgrades own solution
- **WHEN** a CREATOR user calls `POST /api/solutions/:id/upgrade` for their own solution
- **AND** the solution status is DRAFT, REJECTED, or PUBLISHED
- **THEN** a new Solution with status DRAFT is created
- **AND** the new solution's upgraded_from_id is set to the source solution ID
- **AND** the new solution's upgraded_from_version is set to the source solution version
- **AND** the new solution's is_upgrade field is set to true
- **AND** basic information (title, description, category, price, specs, features, tags) is copied
- **AND** the creatorId is set to the current user's creator profile ID

#### Scenario: Creator upgrades published solution
- **WHEN** a CREATOR user calls `POST /api/solutions/:id/upgrade` for a PUBLISHED solution
- **AND** the solution is not owned by the creator
- **THEN** a new Solution with status DRAFT is created
- **AND** the upgrade relationship is established
- **AND** basic information is copied

#### Scenario: Creator upgrades with custom title
- **WHEN** a CREATOR user upgrades a solution with a custom title
- **THEN** the new solution uses the custom title
- **AND** if no title is provided, the default is "{original_title} - 升级版"

#### Scenario: Creator upgrades with selected assets
- **WHEN** a CREATOR user upgrades a solution with upgradeAssets=true
- **THEN** all SolutionFile records from the source solution are copied
- **AND** new SolutionFile records are created with the new solution ID
- **AND** file URLs and metadata are preserved

#### Scenario: Creator upgrades with selected BOM
- **WHEN** a CREATOR user upgrades a solution with upgradeBom=true
- **THEN** all SolutionBomItem records from the source solution are copied
- **AND** new SolutionBomItem records are created with the new solution ID
- **AND** BOM item details are preserved

#### Scenario: Creator upgrades with upgrade notes
- **WHEN** a CREATOR user upgrades a solution with upgradeNotes
- **THEN** the upgrade_notes field is set on the new solution
- **AND** the notes describe what was upgraded

#### Scenario: Cannot upgrade non-accessible solution
- **WHEN** a CREATOR user attempts to upgrade a solution with status PENDING_REVIEW
- **AND** the solution is not owned by the creator
- **THEN** the system returns a 403 Forbidden error
- **AND** the error message indicates insufficient permissions

### Requirement: Solution Upgrade History
The system SHALL maintain and display upgrade relationships between solutions.

#### Scenario: View upgrade source
- **WHEN** a user views a solution with is_upgrade=true
- **THEN** the solution displays "基于 [源方案名称] 升级"
- **AND** a link to the source solution is provided

#### Scenario: View upgrade descendants
- **WHEN** a user views a solution
- **AND** other solutions have upgraded_from_id pointing to this solution
- **THEN** the solution displays "已被升级 X 次"
- **AND** a list of upgraded solutions is available

#### Scenario: Get upgrade history
- **WHEN** a user calls `GET /api/solutions/:id/upgrade-history`
- **THEN** all solutions that upgraded from this solution are returned
- **AND** solutions are ordered by createdAt descending
- **AND** each solution includes title, status, and upgrade_notes

### Requirement: Solution Upgrade Permission Validation
The system SHALL enforce that CREATOR users can upgrade their own solutions and published solutions, and ADMIN users can upgrade any solution.

#### Scenario: Creator upgrades own solution
- **WHEN** a CREATOR user upgrades their own solution
- **THEN** the upgrade action is allowed
- **AND** the new solution is created

#### Scenario: Creator upgrades published solution
- **WHEN** a CREATOR user upgrades a PUBLISHED solution
- **THEN** the upgrade action is allowed
- **AND** the new solution is created

#### Scenario: Creator cannot upgrade private solution
- **WHEN** a CREATOR user attempts to upgrade a DRAFT solution owned by another creator
- **THEN** the system returns a 403 Forbidden error
- **AND** the error message indicates insufficient permissions

#### Scenario: Admin can upgrade any solution
- **WHEN** an ADMIN user upgrades any solution
- **THEN** the upgrade action is allowed
- **AND** the new solution is created

### Requirement: Solution Upgrade Rate Limiting
The system SHALL limit the frequency of solution upgrades to prevent abuse.

#### Scenario: Creator upgrades within limit
- **WHEN** a CREATOR user upgrades a solution
- **AND** the user has upgraded fewer than 5 solutions in the last 24 hours
- **THEN** the upgrade action is allowed

#### Scenario: Creator exceeds upgrade limit
- **WHEN** a CREATOR user attempts to upgrade a solution
- **AND** the user has already upgraded 5 solutions in the last 24 hours
- **THEN** the system returns a 429 Too Many Requests error
- **AND** the error message indicates the daily limit has been reached

