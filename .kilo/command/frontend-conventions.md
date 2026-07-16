# SLI ERP — Frontend Coding Conventions

## React Hook Form — Custom `onChange` on registered selects
When adding a custom `onChange` on a `<select>` already registered with RHF, **always** call the form's native handler inside the custom handler so form state/watchers stay reactive:
```tsx
<select
  {...register("field")}
  onChange={(e) => {
    register("field").onChange(e);
    myCustomHandler(e.target.value);
  }}
/>
```

## Global Search Integration
Any new module or list-view that lives inside a larger page (Admin Panel, Inventory Panel, etc.) must plug into that parent's global `searchQuery` state:
- Pass `searchQuery={searchQuery}` down as a prop.
- Filter the displayed list with `Array.prototype.filter()` using that query.

## Mandatory Field Asterisks
- **Do NOT** manually add `<span className="text-red-500">*</span>` next to labels.
- Just put the HTML5 `required` attribute on the `<input>`/`<select>`.
- Global CSS (`label:has(+ *:required)::after` in `index.css`) auto-appends the red asterisk to the preceding label.

## Item Type Badges
See `rbac-permissions.md` — admin/IT badges are mandatory wherever items are listed.

## Double-Submit Guard
See `workflow-engine.md` — every form with an API-calling submit handler needs an `isSubmitting` guard.

## Back Navigation
See `workflow-engine.md` — never add a page-level back button; the global one in `Layout.tsx` already handles it.
