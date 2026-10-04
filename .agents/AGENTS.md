# 🤖 SLI ERP System — Workspace Rules & AI Agent Development Guidelines

This document defines the mandatory architecture, security, development, SDLC, multi-agent workflow, implementation planning, testing, deployment, and regression-prevention standards for the SLI ERP System.

The AI Agent MUST follow these guidelines for all NEW development, enhancement, modification, integration, bug fixing, and refactoring activities.

---

# 1. 🏗️ Core Architecture & Technology Standards

## 1.1 Technology Stack

The current system architecture is based on:

* React 18
* TypeScript
* Vite
* Tailwind CSS
* Node.js
* Express
* Drizzle ORM
* Supabase PostgreSQL

The AI Agent MUST understand and respect the existing architecture before making changes.

The Agent MUST NOT introduce a new framework, ORM, database technology, architectural pattern, or major dependency without proper analysis and required approval.

---

## 1.2 Multi-Tenancy

The system is strictly multi-tenant.

Almost all tenant-specific tables contain:

```text
companyId
```

All tenant-sensitive backend operations MUST resolve the active tenant using:

```typescript
let companyId = await resolveTenantId(req);
```

The Agent MUST:

* Always identify the current tenant.
* Restrict database queries to the resolved tenant.
* Prevent cross-tenant data access.
* Prevent cross-tenant API operations.
* Prevent cross-tenant reporting.
* Prevent cross-tenant search/filtering.
* Never use cross-tenant fallback logic.
* Never assume a user belongs to a tenant without validating it.

Any new feature that stores, retrieves, updates, deletes, or reports tenant-specific data MUST implement tenant isolation.

---

# 2. 🔐 Security Standards

All NEW development MUST follow secure development practices.

## 2.1 Authentication

The Agent MUST properly validate authenticated users before accessing protected resources.

No protected API, page, action, or data operation may bypass authentication.

---

## 2.2 Authorization & RBAC

Features and APIs MUST enforce appropriate permissions.

The standard permission pattern is:

```typescript
isSuperAdmin || getPermission('Feature Name')?.canView
```

Appropriate permission checks MUST also be applied for:

* Create
* View
* Edit
* Delete
* Approve
* Reject
* Export
* Administrative actions
* Other sensitive operations

New permissions MUST be registered in the appropriate permission hierarchy in:

```text
Admin.tsx
```

The Agent MUST NOT create a feature that is visible/actionable to unauthorized users.

---

## 2.3 Security Middleware

Production backend configuration MUST maintain:

* Helmet
* Restricted CORS
* Express rate limiting
* Secure authentication
* Input validation
* Appropriate error handling

Production CORS MUST be restricted to the configured:

```text
FRONTEND_URL
```

The application MUST NOT expose unnecessary server information such as:

```text
X-Powered-By
```

---

# 3. 🎨 Frontend & UI Standards

All NEW frontend development MUST follow the existing UI architecture and conventions.

## 3.1 Searchable Dropdowns

For large datasets such as:

* Users
* Departments
* Designations
* Branches
* Vendors
* Other large entity lists

use searchable/custom dropdown components instead of native `<select>` where appropriate.

---

## 3.2 Required Fields

Do NOT manually add:

```tsx
<span className="text-red-500">*</span>
```

Required fields MUST use the HTML5:

```html
required
```

attribute.

The existing CSS mechanism will display the required indicator.

---

## 3.3 Local Navigation

Every Add/Edit/View page MUST provide a local back navigation control.

Example:

```tsx
<ArrowLeft />
```

The page MUST return to the appropriate list/context.

Do NOT depend on a global layout back button for individual module forms.

---

## 3.4 Dynamic Currency

Never hardcode:

```text
$
৳
€
£
```

or any other currency symbol.

Use the existing:

```typescript
useCurrency()
```

hook from `SettingsProvider`.

Example:

```tsx
{currencySymbol}{amount}
```

---

## 3.5 Sidebar Routing

Whenever a new sub-route is introduced, the Agent MUST ensure that the route is correctly handled by the sidebar's active-module logic.

Existing:

```text
path.startsWith()
```

based routing logic MUST be updated where required.

A new route MUST NOT cause the relevant sidebar menu to disappear.

---

## 3.6 Form Double Submission Prevention

All POST/PUT/PATCH form submissions MUST protect against duplicate submissions.

Use an appropriate:

```text
isSubmitting
```

guard.

Submit buttons MUST be disabled while the request is processing.

---

## 3.7 React Hook Form

When using React Hook Form with custom `onChange` handlers, the original registered handler MUST also be called.

Example:

```typescript
register(field).onChange(e)
```

must not be omitted when adding custom behavior.

---

## 3.8 RBAC Sidebar & Navigation Menu Visibility Standard

Strict RBAC visibility MUST be enforced for all navigation elements across all modules (Procurement, Inventory, Asset Management, System Configuration, User Panel, etc.):

* **No Forbidden Menus in Sidebar**: Any menu or submenu for which the user's role does not possess view permission (`canView`) MUST NOT be displayed in the sidebar navigation.
* **No Access Denied Bait**: Under no circumstances should an unpermitted menu item be rendered in the sidebar only to navigate the user to an "Access Denied" page.
* **Automatic Empty Group Suppression**: If all submenus within an accordion group (e.g., "Fixed Asset", "Digital Asset", "User Setting") are unpermitted for the active user, the entire parent group header MUST be hidden automatically.
* **Strict Boolean Evaluation**: Visibility conditions for menus MUST be resolved strictly as booleans (e.g. `Boolean(...)` or `hasMenuAccess()`). Never use loose `nav.show !== false` or `sub.show === false` checks that allow `undefined` to leak through as visible.

---

# 4. 🔄 General Workflow & Approval Standards

The system uses the Global Inbox as the central location for actionable approval/review workflows.

Where a feature uses an approval workflow:

* Approval actions should occur through the appropriate workflow/inbox mechanism.
* Status/list pages should remain suitable for auditing and monitoring.
* Approval actions MUST respect RBAC.
* Approval actions MUST respect tenant isolation.
* Approval state MUST remain consistent with the underlying business document.

Any new workflow must be analyzed before implementation.

---

# 5. 🧭 Mandatory SDLC & Multi-Agent Development Model

## 5.1 General Principle

The AI IDE Agent MUST operate using a structured SDLC-based multi-agent development process.

The Agent MUST NOT treat every requirement as a direct coding task.

A requirement MUST first pass through analysis and planning before development begins.

The overall development lifecycle is:

```text
Requirement
    ↓
Project Manager
    ↓
Product Manager
    ↓
Business Analyst
    ↓
BRD
    ↓
SRS
    ↓
Existing System / Root-Level Analysis
    ↓
Implementation Plan
    ↓
Development
    ↓
TypeScript / Build Validation
    ↓
Unit Testing
    ↓
API Testing
    ↓
Integration Testing
    ↓
Regression Testing
    ↓
QA / Acceptance Testing
    ↓
    ├── FAIL → Developer Agent → Fix → Re-Test
    │
    └── PASS
          ↓
      Deployment
```

This lifecycle is mandatory for substantial NEW development.

---

# 6. 👥 Multi-Agent Team Structure

The IDE Agent MUST logically organize the development work into specialized roles.

The roles may be implemented as separate AI agents, sub-agents, tasks, or clearly separated internal stages depending on the IDE's capabilities.

The minimum responsibilities are:

---

## 6.1 Project Manager Agent

Responsible for overall coordination.

Responsibilities:

* Understand the requirement.
* Define project scope.
* Break the requirement into work packages.
* Identify dependencies.
* Identify risks.
* Define milestones.
* Coordinate other agents.
* Track deliverables.
* Ensure that development does not start prematurely.
* Ensure that testing and QA are completed before deployment.

The Project Manager is responsible for maintaining overall process discipline.

---

## 6.2 Product Manager Agent

Responsible for product/business objectives.

Responsibilities:

* Understand why the feature is required.
* Define expected product behavior.
* Identify user needs.
* Identify business value.
* Define feature scope.
* Define out-of-scope areas.
* Define acceptance criteria.
* Identify affected user groups.

---

## 6.3 Business Analyst Agent

Responsible for business-process analysis.

Responsibilities:

* Analyze the existing business process.
* Understand the proposed process.
* Identify business rules.
* Identify actors.
* Identify roles.
* Identify approval requirements.
* Identify exceptions.
* Identify edge cases.
* Identify dependencies.
* Map current vs proposed workflow.

The Business Analyst MUST NOT assume that a new requirement is isolated from the existing system.

---

## 6.4 BRD Agent

Responsible for Business Requirements Documentation.

The BRD MUST document, where applicable:

* Business objective
* Problem statement
* Business requirements
* User requirements
* Process flow
* Business rules
* Actors
* Roles
* Approval requirements
* Exceptions
* Dependencies
* Assumptions
* Acceptance criteria
* Out-of-scope requirements

The BRD MUST be sufficiently clear for the technical team to understand the intended business behavior.

---

# 7. 📐 SRS Development

The SRS Agent converts the approved business requirements into technical/system requirements.

The SRS SHOULD cover:

* System behavior
* Functional requirements
* Non-functional requirements
* Frontend requirements
* Backend requirements
* API requirements
* Database requirements
* Authentication
* Authorization
* RBAC
* Multi-tenancy
* Validation
* Error handling
* Logging
* Notifications
* Workflow
* Integration
* Security
* Performance
* Data integrity
* Reporting
* Testing requirements

The SRS MUST identify the affected existing components before implementation.

---

# 8. 🔍 Mandatory Root-Level Existing System Analysis

## 8.1 No Direct Coding Into Existing Features

When a new requirement affects an existing feature, the Agent MUST NOT immediately modify the existing code.

First, it MUST perform root-level analysis.

The Agent MUST understand the complete dependency chain.

---

## 8.2 Required Analysis Areas

Before modifying an existing feature, analyze:

### Frontend

* Pages
* Components
* Forms
* Hooks
* Context/providers
* State management
* API calls
* Shared components
* Routing
* Permissions
* UI dependencies

### Backend

* Routes
* Controllers
* Services
* Middleware
* Business logic
* Validation
* Authentication
* Authorization
* Notifications
* Background processes

### Database

* Tables
* Columns
* Relationships
* Foreign keys
* Constraints
* Indexes
* Existing records
* Data dependencies
* Schema impact

### Workflow

* BPMN
* Approval flow
* Inbox
* Notifications
* Status transitions
* Role/designation dependencies

### Integration

* Internal APIs
* External APIs
* Third-party services
* Scheduled processes
* Webhooks
* Other modules

### Security

* Tenant isolation
* RBAC
* Authentication
* Authorization
* Sensitive data
* API exposure

### Testing

* Existing tests
* Affected test cases
* Regression areas
* New test requirements

---

# 9. 📄 Mandatory Implementation Plan

## 9.1 No Implementation Plan = No Development

The most important development rule is:

> **NO NEW DEVELOPMENT MAY START WITHOUT A PROPER IMPLEMENTATION PLAN.**

The Agent MUST NOT start coding simply because a user described a feature.

The requirement MUST first be converted into a structured Implementation Plan.

---

## 9.2 Implementation Plan Must Include

Every substantial new development or modification MUST include:

### 1. Requirement Summary

What needs to be built or changed.

### 2. Business Objective

Why the change is required.

### 3. Existing System Analysis

How the existing system currently works.

### 4. Root Dependency Analysis

Where the existing feature connects with other parts of the system.

### 5. Affected Modules

List every affected module.

### 6. Frontend Impact

Identify:

* Pages
* Components
* Forms
* Hooks
* Context
* Routing
* UI elements

### 7. Backend Impact

Identify:

* Routes
* Controllers
* Services
* Middleware
* Business logic

### 8. API Impact

Identify:

* Existing APIs to modify
* New APIs
* Request structure
* Response structure
* Validation

### 9. Database Impact

Identify:

* Existing tables
* New tables
* Modified columns
* Relationships
* Indexes
* Migration requirements

### 10. RBAC Impact

Identify:

* Existing permissions
* New permissions
* Roles
* Approval authority

### 11. Workflow Impact

Identify:

* BPMN
* Approval
* Inbox
* Notifications
* Status transitions

### 12. Multi-Tenant Impact

Explain how tenant isolation will be maintained.

### 13. Security Impact

Identify authentication, authorization, validation, and security considerations.

### 14. File-Level Change Plan

Clearly identify:

```text
Files to Create
Files to Modify
Files to Review
Files Not to Touch
```

### 15. Development Sequence

Define the exact order in which implementation will occur.

### 16. Error Handling

Define expected errors and system behavior.

### 17. Rollback Considerations

Define how the change can be safely reverted if required.

### 18. Testing Plan

Define complete testing requirements.

### 19. Regression Plan

Identify existing functionality that must be re-tested.

### 20. Acceptance Criteria

Define exactly when the feature will be considered complete.

---

# 10. 🧑‍💻 Development Agent Rules

The Development Agent MUST:

* Follow the approved BRD.
* Follow the approved SRS.
* Follow the approved Implementation Plan.
* Follow this `AGENTS.md`.
* Preserve existing functionality unless a change is explicitly required.
* Avoid unnecessary refactoring.
* Avoid unrelated modifications.
* Maintain tenant isolation.
* Maintain RBAC.
* Maintain data integrity.
* Maintain existing API contracts unless the change is approved.
* Maintain existing UI behavior unless the requirement changes it.

---

## 10.1 Unexpected Dependency

If the Developer discovers an unexpected dependency:

```text
STOP
↓
ANALYZE
↓
DOCUMENT IMPACT
↓
UPDATE IMPLEMENTATION PLAN
↓
REVIEW / APPROVAL IF REQUIRED
↓
CONTINUE DEVELOPMENT
```

The Agent MUST NOT silently introduce major architectural changes.

---

# 11. 🧪 Mandatory Testing Strategy

Every Implementation Plan MUST include a complete testing strategy.

Testing MUST cover the complete affected stack.

---

## 11.1 TypeScript Testing

At minimum:

* Type checking
* Interface validation
* Type compatibility
* Import/export validation
* Unused/broken references
* Compilation
* Build validation

The Agent MUST resolve TypeScript errors introduced by the new development.

---

# 12. 🖥️ Frontend Testing

Frontend testing MUST include, where applicable:

* Page rendering
* Component rendering
* Form behavior
* Required field validation
* Input validation
* Dropdown behavior
* Search/filter behavior
* Loading state
* Empty state
* Error state
* Success state
* Permission-based visibility
* Role-based behavior
* Tenant-based behavior
* API integration
* Duplicate submission prevention
* Navigation
* Back button behavior
* Responsive behavior
* Existing UI regression

---

# 13. ⚙️ Backend Testing

Backend testing MUST include:

* API endpoint testing
* Authentication
* Authorization
* RBAC
* Tenant isolation
* Request validation
* Business logic
* Database operations
* Error handling
* Edge cases
* Invalid input
* Unauthorized access
* Cross-tenant access attempts
* Duplicate requests
* Data integrity

---

# 14. 🗄️ Database Testing

Database-related development MUST be tested for:

* Schema correctness
* Migration correctness
* Foreign keys
* Constraints
* Relationships
* Data integrity
* Existing data compatibility
* Tenant isolation
* Query correctness
* Duplicate data prevention
* Rollback considerations

Any schema change MUST follow the project's approved migration process.

---

# 15. 🔗 Integration Testing

Where applicable, test:

```text
Frontend
   ↕
Backend API
   ↕
Business Logic
   ↕
Database
```

And also:

```text
Workflow
   ↕
Inbox
   ↕
Notification
```

and:

```text
Internal Module
   ↕
External Integration
```

All affected integration points MUST be tested.

---

# 16. 🔁 Regression Testing

Whenever an existing feature is modified, regression testing is mandatory.

The Agent MUST identify:

* Directly affected functionality
* Indirectly affected functionality
* Shared components
* Shared APIs
* Shared database tables
* Shared business logic
* Related workflows
* Related reports

The Agent MUST verify that existing functionality continues to work.

---

# 17. 🧪 Test Failure & Rework Loop

Testing MUST NOT be treated as the final step only.

The mandatory loop is:

```text
Development
    ↓
Testing
    ↓
PASS ─────────────→ QA
    │
    ↓ FAIL
Developer Agent
    ↓
Fix
    ↓
Re-Test
```

If a test fails:

* The failure MUST be documented.
* The affected area MUST be identified.
* Expected behavior MUST be documented.
* Actual behavior MUST be documented.
* The Developer Agent MUST fix the issue.
* Relevant tests MUST run again.
* Regression testing MUST be repeated where necessary.

A failed feature MUST NOT proceed to deployment.

---

# 18. ✅ QA & Acceptance Gate

Before deployment, QA MUST verify:

* BRD requirements
* SRS requirements
* Implementation Plan
* Acceptance criteria
* Functional behavior
* UI behavior
* Backend behavior
* API behavior
* Database behavior
* RBAC
* Multi-tenancy
* Security
* Regression
* Error handling

The QA Agent MUST clearly determine whether the implementation satisfies the defined acceptance criteria.

---

# 19. 🚦 Definition of Done

A NEW feature is considered complete only when:

* Requirement is clearly defined.
* Business analysis is completed.
* BRD is completed where applicable.
* SRS is completed where applicable.
* Existing-system analysis is completed.
* Root-level dependency analysis is completed.
* Implementation Plan is completed.
* Development is completed.
* TypeScript validation passes.
* Build validation passes.
* Unit testing passes.
* API testing passes.
* Integration testing passes.
* Database testing passes where applicable.
* RBAC testing passes.
* Multi-tenant testing passes.
* Regression testing passes.
* QA validation passes.
* Documentation is updated.
* No known blocking defect remains.

Only then may the feature proceed to deployment.

---

# 20. 📚 Documentation Standards

Whenever new development changes the system architecture, module structure, routing, schema, API behavior, or major UI functionality:

* Update `DEVELOPER_GUIDE.md`.
* Update other relevant technical documentation.
* Update `AGENTS.md` only when core development rules or architecture change.

Documentation MUST accurately reflect the implemented system.

---

# 21. 🗃️ Database Change Control

Any database schema change MUST be explicitly identified in the Implementation Plan.

The Agent MUST NOT make silent structural database changes.

For approved schema changes:

```bash
npx drizzle-kit push
```

should be used according to the project's established process.

If the command fails because of non-interactive CLI prompts, the Agent may use the approved temporary SQL migration approach.

Temporary migration scripts MUST be removed after successful execution.

---

# 22. 🌿 Git & Branching Strategy

New feature development MUST use a dedicated feature branch.

Example:

```text
feature/asset-management
feature/user-management
feature/reporting
feature/notification-system
```

Do NOT directly commit unverified feature development to:

```text
main
```

Feature branches MUST be tested before merging.

---

# 23. 🚀 Deployment Rules

## 23.1 Deployment Gate

Deployment is allowed only when:

```text
Development
    ↓
Testing
    ↓
Regression
    ↓
QA
    ↓
PASS
    ↓
Deployment
```

If QA or required testing fails:

```text
Deployment = BLOCKED
```

The feature MUST return to the Development Agent.

---

## 23.2 Vercel / Preview

New feature development should use dedicated feature branches.

Where configured, feature branches may trigger Vercel Preview Deployments for staging and QA.

Unverified feature code MUST NOT be treated as production-ready.

---

## 23.3 Production Deployment

Production deployment MUST NOT occur without required user approval.

The AI Agent MUST NOT execute:

```bash
npx vercel --prod
```

without explicit user permission.

Production deployment must follow the project's approved deployment mechanism.

---

# 24. 🔒 Production Server Rules

The AI Agent MUST NOT:

* Perform unauthorized direct SSH access.
* Store production server credentials.
* Execute raw SSH commands.
* Bypass the approved deployment mechanism.
* Install unapproved production infrastructure.

Remote production management MUST use the project's approved deployment tooling.

---

# 25. 🧹 Change Isolation & Regression Prevention

The Agent MUST keep every development task focused.

A feature implementation MUST NOT unnecessarily:

* Refactor unrelated modules.
* Rename unrelated variables.
* Change unrelated APIs.
* Modify unrelated database tables.
* Remove existing components.
* Change unrelated UI.
* Change unrelated business logic.

The principle is:

> **Change only what is necessary to implement the approved requirement, while preserving existing functionality.**

---

# 26. ⚠️ Legacy / Existing Development Rule

The system already contains previously completed development.

The Agent MUST NOT attempt to rebuild, refactor, or rewrite existing completed development simply because it does not follow the latest development process.

The existing system should be treated as the current baseline.

However:

If a NEW requirement interacts with existing functionality, the Agent MUST:

```text
Understand Existing Functionality
        ↓
Analyze Dependencies
        ↓
Identify Impact
        ↓
Create Implementation Plan
        ↓
Modify Only Required Areas
        ↓
Test Existing + New Functionality
```

Therefore:

* Existing completed work is preserved.
* New development follows this `AGENTS.md`.
* Modified existing code must follow applicable new rules.
* No unnecessary legacy refactoring is allowed.
* Existing behavior must not be broken unintentionally.

---

# 27. 🧠 AI Agent Decision Rule

Before taking any development action, the Agent MUST ask itself:

1. Is this a NEW feature?
2. Does it affect an EXISTING feature?
3. What existing components are connected to it?
4. What is the root dependency?
5. What database impact exists?
6. What API impact exists?
7. What frontend impact exists?
8. What backend impact exists?
9. What RBAC impact exists?
10. What tenant-isolation impact exists?
11. What workflow impact exists?
12. What security impact exists?
13. What tests are required?
14. What regression tests are required?
15. Is an Implementation Plan completed?
16. Is user approval required before structural changes?
17. Has testing passed before deployment?

If the answer to the Implementation Plan requirement is NO:

> **DO NOT START DEVELOPMENT.**

---

# 28. 🏁 Master Development Principle

The AI Agent MUST follow this principle throughout the project:

> **Analyze first → Document requirements → Understand the existing system → Create implementation plan → Develop → Test → Fix → Regression Test → QA → Deploy.**

Never:

> **Requirement → Immediately Code → Deploy**

The objective is to maintain:

* Stability
* Security
* Maintainability
* Scalability
* Multi-tenant isolation
* Data integrity
* Regression protection
* Clear documentation
* Predictable development
* Controlled deployment

All NEW development MUST follow this governance model.
