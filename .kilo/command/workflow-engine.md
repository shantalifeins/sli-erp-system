# SLI ERP — Workflow Engine, Approvals & Inbox Behavioral Rules

## Inbox-based Approvals
- Users approve, reject, or request revisions on documents (e.g. Requisitions) **only from their Inbox / Global Tasks** (`/inbox`), acting on `inbox_tasks` entries.
- Public/status pages like Requisition List (`/requisition-list`) are **read-only**: show stage details + workflow history timeline, **no action buttons**.
- Requisition List shows PRs in `'Pending Approval'` OR (`'Draft'` and has a `'Review'` entry in `pr_approvals`). Displays "Pending With: Requestor (Revision)" for items sent back.

## Send Back for Review (Revision Loop)
When "Send back for Review" is triggered:
1. Set the document status to `'Draft'`.
2. Set the current `pr_approvals` step status to `'Review'`.
3. **Delete only the remaining** `'Pending'` `pr_approvals` rows.
4. Keep completed/reviewed `pr_approvals` rows — full review history must be preserved.

## Inbox Task Completion
When an approval step is processed (Approved / Rejected / Review):
- Mark **ALL** pending `inbox_tasks` for that document as `'Completed'`.
- Set `actionResult` (`'Approved'` | `'Rejected'` | `'Review'`).
- Update by querying **purely on** `referenceType` + `referenceId` — **do NOT restrict by** `assignedToUid`, so tasks clear globally even when a Super Admin overrides the assignee.

## Inbox Task Creation Fallback
In `notifyApprovers` (or any dynamic approver resolution): if no specific user matches the required department/role combination, still create an `inbox_tasks` row with `assignedToRole` set and `assignedToUid = null`, so Super Admins can see and action it globally.
- **Never** silently drop a step because no user was resolved.

## Inbox Deduplication
- `GET /api/inbox` dynamically deduplicates by (`referenceType`, `referenceId`), keeping only the **most recent** entry, so the frontend doesn't show duplicate history rows for the same document in the 'Completed' tab.

## BPMN Workflow Identification
- `bpmn_definitions` are identified purely by `documentType` (e.g. `'Item Requisition'`, `'Stock Out'`) + `companyId`.
- They are **no longer** split by department.
- Always save/evaluate workflows on `documentType`, never on department.

## Form Double-Submit Prevention
- Any form that POSTs (PR creation, Stock Out submission, etc.) must wrap the API call with a robust `isSubmitting` state that disables the submit button while the request is in flight.

## Global Back Navigation
- A single universal Back button lives in `Layout.tsx`'s header:
  ```ts
  window.history.state.idx > 0 ? navigate(-1) : navigate(moduleDashboard)
  ```
- **Do not** add redundant/page-level back buttons inside individual page components.
