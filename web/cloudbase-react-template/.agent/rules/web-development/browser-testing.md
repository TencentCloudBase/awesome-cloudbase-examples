# Browser Validation

Use `agent-browser` when the task depends on what actually happens in the browser, especially for:

- routing and page navigation
- form submission and validation
- modal, drawer, and tab interactions
- login flow checks
- post-fix smoke tests for rendering or event bugs

## Default workflow

1. Open the relevant page or start from the entry route.
2. Reproduce the changed or broken interaction deliberately.
3. Apply the fix in code.
4. Re-run the same browser flow to confirm the new behavior.
5. Note any remaining gap if the full flow is blocked by missing data, credentials, or backend dependencies.

## What to capture

- route or page opened
- user action taken
- expected result
- actual result before the fix
- actual result after the fix

## Common mistakes

- Claiming a frontend bug is fixed without checking the actual browser behavior.
- Verifying only the happy path when the bug is triggered by navigation, refresh, empty states, or validation errors.
- Using browser automation for purely visual direction work that should have gone through `ui-design` first.
