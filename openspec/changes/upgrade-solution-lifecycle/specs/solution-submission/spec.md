## MODIFIED Requirements

### Requirement: Solution Status Transition Validation
The system SHALL enforce valid status transitions according to the updated state machine, including PENDING_REVIEW solutions that need revision.

#### Scenario: Creator edits solution needing revision
- **WHEN** a CREATOR user calls `PUT /api/solutions/:id` with status PENDING_REVIEW
- **AND** the solution has a NEEDS_REVISION review decision
- **THEN** the solution fields are updated
- **AND** the updatedAt timestamp is updated
- **AND** the solution status remains PENDING_REVIEW

#### Scenario: Creator resubmits solution after revision
- **WHEN** a CREATOR user calls `POST /api/solutions/:id/submit` with status PENDING_REVIEW
- **AND** the solution has a NEEDS_REVISION review decision
- **AND** the solution has been modified
- **THEN** a new SolutionReview record is created with fromStatus=PENDING_REVIEW, toStatus=PENDING_REVIEW
- **AND** the review record includes decision=PENDING
- **AND** the solution is ready for re-review

