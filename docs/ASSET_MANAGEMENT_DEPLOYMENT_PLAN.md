# Asset Management — Branching & Deployment Plan

## Branch Architecture Overview

```
GitHub: shantalifeins/sli-erp-system
│
├── main                          ← LIVE (Production server via MCP)
│   └── Deployed to: Live Server (10.16.49.78) via scripts/mcp-deploy-server.ts
│
└── feature/asset-management      ← NEW DEVELOPMENT (this branch)
    └── Deployed to: Vercel (staging/preview)
```

---

## Environment Mapping

| Environment | Git Branch | Deployed By | DB | Auth Mode |
|-------------|-----------|-------------|-----|-----------|
| **Live / Production** | `main` | `scripts/mcp-deploy-server.ts` → `git pull origin main` on live server | Live PostgreSQL (`postgres_prod`) | `AUTH_MODE=postgres` |
| **Staging / Preview** | `feature/asset-management` | Vercel (auto-deploy on push) | Supabase PostgreSQL | `AUTH_MODE=supabase` |
| **Local Dev** | `feature/asset-management` | `npm run dev` | Supabase PostgreSQL | `AUTH_MODE=supabase` |

---

## Branch Rules (এগুলো ভাঙলে চলবে না)

1. **`main` এ সরাসরি commit করা যাবে না** — শুধু PR merge এর মাধ্যমে।
2. **`feature/asset-management` থেকে `main` এ merge করতে হলে:**
   - সব Phase (0–11) complete ও tested হতে হবে।
   - Phase 12 (Hardening) checklist green হতে হবে।
   - PR review ও approval লাগবে।
3. **Vercel preview URL** শুধু `feature/asset-management` branch track করবে।
4. **Live server** শুধু `main` branch track করবে — কখনো `feature/*` branch pull করবে না।

---

## Step-by-Step Setup Completed ✅

### ১. Branch তৈরি ও Push
```bash
# ইতিমধ্যে করা হয়েছে:
git checkout -b feature/asset-management   # main থেকে branch করা
git push -u origin feature/asset-management  # GitHub-এ push
```
**Status**: ✅ Done — branch live at `origin/feature/asset-management`

---

### ২. Vercel Branch Configuration

Vercel Dashboard-এ নিচের কাজগুলো করতে হবে (manual, Vercel UI-তে):

**Step A — Existing Vercel Project Settings:**
1. Vercel Dashboard → `sli-erp-system` project → **Settings** → **Git**
2. **Production Branch**: `main` (change করবেন না — live সেটা)
3. **Preview Branches**: `feature/asset-management` automatically preview deploy পাবে

**Step B — নতুন Preview Deployment দেখতে:**
- যেকোনো push to `feature/asset-management` → Vercel automatically build করবে
- Preview URL: `sli-erp-system-git-feature-asset-management-shantalifeins.vercel.app` (বা similar)
- অথবা Vercel Dashboard → Deployments tab → branch filter করে দেখুন

**Step C — Environment Variables (Staging-specific):**

Vercel Dashboard → Settings → **Environment Variables** → **Preview** environment-এ নিচেরগুলো নিশ্চিত করুন:

```
DATABASE_URL=<Supabase connection string>
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
AUTH_MODE=supabase
NODE_ENV=production
```

> Important: Production environment variables (`main` branch) আলাদা থাকবে — live DB এর credentials। Preview environment-এ Supabase credentials দিন।

---

### ৩. Local Development Setup

```bash
# feature branch-এ যাওয়া (ইতিমধ্যে আছেন)
git checkout feature/asset-management

# Latest main থেকে sync রাখা (প্রতিটা feature phase শুরুর আগে)
git fetch origin
git merge origin/main  # main-এ যদি কোনো hotfix আসে

# Local dev server start
npm run dev
```

---

### ৪. Phase-wise Development Workflow

প্রতিটা Phase এই workflow অনুসরণ করবে:

```
1. Local coding (feature/asset-management branch)
   ↓
2. Test locally: npm run dev → manual verify
   ↓
3. Run tests: npx vitest run tests/
   ↓ (সব green হলে)
4. Commit to feature/asset-management
   git add .
   git commit -m "feat(assets): Phase X — [description]"
   ↓
5. Push to GitHub
   git push origin feature/asset-management
   ↓
6. Vercel auto-deploys Preview
   ↓
7. Preview URL-এ UAT/manual testing
   ↓ (approved হলে পরের phase শুরু)
```

**Commit Message Convention:**
```
feat(assets): Phase 1 — plugin registration and schema foundation
feat(assets): Phase 2 — asset CRUD API with tenant isolation
feat(assets): Phase 3 — frontend UI and sidebar menu wiring
fix(assets): Phase 4 — GRN hook deduplication edge case
test(assets): Phase 5 — depreciation engine unit tests
```

---

### ৫. Database Strategy (Staging vs Live)

| | Staging (Vercel + Supabase) | Live Server |
|--|--|--|
| Schema migration | `npx drizzle-kit push` (Supabase DB) | Migration SQL manually via MCP tools |
| New tables | Auto-created via drizzle push | Raw SQL `ALTER TABLE` via Node.js script |
| Data | Test/seed data only | Real production data — **never touch** |
| `drizzle-kit push` | ✅ Safe — staging DB | ❌ Never run directly on live |

**Schema Push (for each phase that has schema changes):**
```bash
# Staging DB-তে push করা (local থেকে)
npx drizzle-kit push --config=src/shared/db/drizzle.config.ts
```

---

### ৬. Final Merge to Main (Phase 12 complete হলে)

```bash
# Phase 12 সম্পূর্ণ, সব tests green, UAT passed

# Step 1: main branch sync করা
git checkout main
git pull origin main

# Step 2: feature branch merge (no fast-forward — history preserve করতে)
git merge --no-ff feature/asset-management -m "feat: Asset Management Module — Phase 0-12 complete"

# Step 3: Push to main
git push origin main

# Step 4: Live server deploy (MCP tool দিয়ে)
# scripts/mcp-deploy-server.ts → git pull origin main on live server
# Direct SSH নিষিদ্ধ
```

---

### ৭. Branch Protection Rules (GitHub-এ Set করতে হবে)

GitHub → Repository Settings → Branches → Add rule:

**For `main`:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass (Vercel preview build)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  Branch: feature/asset-management                        │
│  Purpose: Asset Management module development            │
│  Base: main (at commit 8fa05cf)                         │
│  GitHub PR: github.com/shantalifeins/sli-erp-system/    │
│             pull/new/feature/asset-management            │
│                                                          │
│  Local Dev: npm run dev (Supabase DB)                   │
│  Tests: npx vitest run tests/                            │
│  Schema: npx drizzle-kit push (Supabase only)           │
│                                                          │
│  Vercel Preview: auto-deploy on push                     │
│  Live Server: main branch only (MCP deploy)             │
└─────────────────────────────────────────────────────────┘
```
