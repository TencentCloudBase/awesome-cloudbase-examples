---
name: cloudbase-document-database-web-sdk
description: Use CloudBase document database Web SDK to query, create, update, and delete data. Supports complex queries, pagination, aggregation, realtime, and geolocation queries.
version: 2.16.1
alwaysApply: false
---

# CloudBase Document Database Web SDK

## Activation Contract

### Use this first when

- A browser or Web app must read or write CloudBase document database data through `@cloudbase/js-sdk`.
- The request mentions `app.database()`, `db.collection()`, `.where()`, `.watch()`, pagination, aggregation, or geolocation queries in a Web frontend.

### Read before writing code if

- The task is clearly browser-side, but you still need to decide between Web SDK, Mini Program SDK, or backend access.
- The request touches login state, collection permissions, or realtime updates.

### Then also read

- Web login and caller identity -> `../auth-web/SKILL.md`
- General Web app structure -> `../web-development/SKILL.md`
- Mini Program database code -> `../no-sql-wx-mp-sdk/SKILL.md`

### Do NOT use for

- Mini Program code using `wx.cloud.database()`.
- Server-side or cloud-function database access.
- SQL / MySQL database operations.
- Pure resource-permission administration with no browser SDK code.

### Common mistakes / gotchas

- Querying before the user is signed in when the collection rules require identity.
- Using `wx.cloud.database()` or Node SDK patterns in browser code.
- Initializing CloudBase lazily with dynamic imports instead of a shared synchronous app instance.
- Treating security rules as result filters rather than request validators.
- Forgetting pagination or indexes for larger collections.

### Minimal checklist

- Confirm this is browser-side document database work.
- Initialize CloudBase once and reuse the same `app` / `db` instance.
- Verify auth expectations before CRUD.
- Read the right companion reference file for the specific operation.

## Overview

This skill covers **browser-side document database usage** via `@cloudbase/js-sdk`.

Use it for:

- CRUD in a Web app
- complex queries and pagination
- aggregation
- realtime listeners with `watch()`
- geolocation queries

## Canonical initialization

```javascript
import cloudbase from "@cloudbase/js-sdk";

const app = cloudbase.init({
  env: "your-env-id"
});

const db = app.database();
const _ = db.command;
```

Important rules:

- Sign in before querying if the collection rules require identity.
- Keep a single shared app/database instance.
- Do not hide initialization inside ad-hoc async loaders unless the framework truly requires it.

## Quick routing

- CRUD -> `./crud-operations.md`
- Complex queries -> `./complex-queries.md`
- Pagination -> `./pagination.md`
- Aggregation -> `./aggregation.md`
- Realtime listeners -> `./realtime.md`
- Geolocation -> `./geolocation.md`
- Security rules -> `./security-rules.md`

## Working rules for a coding agent

1. **Start from the auth model**
   - If the page relies on logged-in user identity, read the Web auth skill before writing database code.

2. **Keep browser code browser-native**
   - Use `app.database()` and collection references.
   - Do not mix in MCP management flows or SQL mental models.

3. **Respect security rules**
   - Collection rules can reject requests before data is read.
   - If the task fails with permission issues, inspect the rule model rather than assuming the query syntax is wrong.

4. **Return user-friendly errors**
   - Database errors must become readable UI or application errors, not silent failures.

## Quick examples

### Simple query

```javascript
const result = await db.collection("todos")
  .where({ completed: false })
  .get();
```

### Ordered pagination

```javascript
const result = await db.collection("posts")
  .orderBy("createdAt", "desc")
  .skip(20)
  .limit(10)
  .get();
```

### Field selection

```javascript
const result = await db.collection("users")
  .field({ name: true, email: true, _id: false })
  .get();
```

## Best practices

1. Define collection-level types or model wrappers in the app code.
2. Use meaningful collection naming conventions.
3. Select only required fields.
4. Add indexes for frequent filters or sort keys.
5. Pair frontend CRUD with explicit permission design.
6. Use pagination instead of unbounded reads.

## Error handling

```javascript
try {
  const result = await db.collection("todos").get();
  console.log(result.data);
} catch (error) {
  console.error("Database error:", error);
}
```

When the SDK returns an operation result, check error indicators and translate them into readable application behavior.
