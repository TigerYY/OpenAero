# Documentation Style Guide

**Version**: 1.0.0  
**Last Updated**: 2025-10-23  
**Purpose**: Standardize documentation formatting and style across the OpenAero platform

## General Principles

### 1. Clarity and Consistency
- Use clear, concise language
- Maintain consistent terminology throughout all documents
- Avoid jargon unless necessary, and define technical terms when used
- Write for the intended audience (technical vs. business stakeholders)

### 2. Structure and Organization
- Use hierarchical headings (H1 → H2 → H3 → H4)
- Keep sections focused and logically organized
- Use bullet points and numbered lists for clarity
- Include table of contents for longer documents

### 3. Visual Consistency
- Use consistent formatting for similar content types
- Maintain consistent spacing and indentation
- Use tables for structured data presentation
- Include visual elements (diagrams, charts) when helpful

## Markdown Formatting Standards

### Headers
```markdown
# H1 - Document Title (use only once per document)
## H2 - Major Sections
### H3 - Subsections
#### H4 - Minor Subsections (use sparingly)
```

### Lists
```markdown
- Use bullet points for unordered lists
- Keep items concise and parallel
- Use numbered lists for sequential steps

1. First step
2. Second step
3. Third step
```

### Code and Technical Content
```markdown
`inline code` for short code snippets

```language
// Code blocks for longer examples
function example() {
  return "formatted code";
}
```
```

### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

### Links and References
```markdown
[Link text](URL) - External links
[Internal link](relative/path) - Internal links
[Reference link][ref-id] - Reference-style links

[ref-id]: URL "Optional title"
```

## Content Standards

### 1. Document Headers
Every document should start with:
```markdown
# Document Title

**Feature**: [feature-name]  
**Date**: [YYYY-MM-DD]  
**Status**: [Draft/Review/Approved/Archived]  
**Purpose**: [Brief description of document purpose]
```

### 2. Status Indicators
Use consistent status indicators:
- ✅ **Completed** - Task or feature is complete
- 🔄 **In Progress** - Currently being worked on
- 📋 **Planned** - Scheduled for future work
- ⚠️ **Blocked** - Cannot proceed due to dependencies
- ❌ **Deprecated** - No longer needed or supported

### 3. Priority Levels
Use consistent priority notation:
- **P0** - Critical (must be completed immediately)
- **P1** - High (important for current milestone)
- **P2** - Medium (important for future milestones)
- **P3** - Low (nice to have)

### 4. File Naming Conventions
- Use kebab-case for file names: `feature-specification.md`
- Use descriptive names that indicate content
- Include version numbers when appropriate: `api-v2-specification.md`
- Use consistent extensions: `.md` for Markdown files

## PRD-Specific Standards

### 1. Feature Module Format
```markdown
### Feature: [Feature Name]

**Status**: [Status with emoji]  
**Priority**: [P0/P1/P2/P3]  
**Category**: [Core/Integration/UI/API/Security]  
**Dependencies**: [List of dependencies or "None"]  

**Description**: [Clear description of the feature]

**Acceptance Criteria**:
- [ ] [ ] Criterion 1
- [ ] [ ] Criterion 2

**Technical Requirements**:
- [Requirement 1]
- [Requirement 2]

**Implementation Notes**:
- [Notes about implementation]
```

### 2. User Story Format
```markdown
### User Story [Number] - [Title] (Priority: [P0/P1/P2/P3])

As a [user type], I need [requirement] so that [benefit].

**Why this priority**: [Justification for priority level]

**Independent Test**: [How this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [context], **When** [action], **Then** [expected result]
2. **Given** [context], **When** [action], **Then** [expected result]
```

### 3. Technical Requirement Format
```markdown
### [Requirement ID]: [Requirement Title]

**Description**: [Clear description of the requirement]

**Rationale**: [Why this requirement exists]

**Acceptance Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Dependencies**: [List of dependencies]

**Implementation Notes**: [Technical implementation details]
```

## Review and Approval Process

### 1. Review Checklist
Before submitting any document for review, ensure:
- [ ] All required sections are completed
- [ ] Status indicators are accurate and consistent
- [ ] Links are working and properly formatted
- [ ] Tables are properly formatted and readable
- [ ] Code examples are syntactically correct
- [ ] Spelling and grammar are checked
- [ ] Document follows this style guide

### 2. Review Process
1. **Self-Review**: Author reviews against this style guide
2. **Peer Review**: Another team member reviews for content and style
3. **Technical Review**: Technical accuracy and completeness
4. **Business Review**: Business alignment and clarity
5. **Final Approval**: Stakeholder approval for publication

### 3. Version Control
- Use Git for all documentation version control
- Include meaningful commit messages
- Tag major versions appropriately
- Maintain change logs for significant updates

## Tools and Automation

### 1. Linting
- Use `.markdownlint.json` configuration for consistent formatting
- Run linting before committing changes
- Fix all linting errors before review

### 2. Link Checking
- Use automated link checking tools
- Verify all internal and external links
- Update broken links promptly

### 3. Format Validation
- Use automated format checking
- Ensure consistent Markdown formatting
- Validate table formatting and structure

## Examples

### Good Example
```markdown
### Feature: User Authentication

**Status**: ✅ Completed  
**Priority**: P0  
**Category**: Core  
**Dependencies**: None  

**Description**: Secure user authentication system with email/password authentication.

**Acceptance Criteria**:
- [x] Users can register with email and password
- [x] Users can log in securely
- [x] Password reset functionality works

**Technical Requirements**:
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting for login attempts
- Session management

**Implementation Notes**:
- Completed in v1.2.0
- All tests passing
- Security audit completed
```

### Bad Example
```markdown
### user auth

status: done
priority: high

users can login

requirements:
- jwt
- bcrypt
- rate limiting
```

## Maintenance

This style guide should be:
- Reviewed quarterly for updates
- Updated when new content types are introduced
- Enforced through automated tools where possible
- Referenced in all documentation templates

**Last Review**: 2025-10-23  
**Next Review**: 2026-01-23
