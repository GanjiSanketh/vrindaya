## Summary

<!-- What does this PR change, and why? -->

## Related Issue(s)

<!-- Closes #... / Relates to #... -->

## Checklist

- [ ] Build passes locally (`ng build` for `web/`, `dotnet build` for `api/`)
- [ ] Angular changes tested (`npm run lint`, `npm run test:ci`, and manually exercised in the browser)
- [ ] API changes tested (`dotnet build` with 0 warnings/errors; manually exercised via Swagger or `curl`)
- [ ] No secrets committed (checked `git diff` for tokens, keys, passwords — see [docs/SECURITY.md](../docs/SECURITY.md#secrets))
- [ ] Documentation updated (README, `docs/API_REFERENCE.md`, `docs/database/firestore-schema.md`, etc. — whichever apply)

## Screenshots

<!-- Required for any UI-visible change. Drag and drop before/after images here, or remove this section if not applicable. -->

## Breaking Changes

<!--
Does this change the Firestore schema, an API contract, environment
variable names, or deployment configuration in a way that requires
action from other environments/consumers? Describe the migration path,
or write "None."
-->

## Reviewer Notes

<!--
Anything you want the reviewer to pay special attention to — a tricky
edge case, an area you're unsure about, or a deliberate deviation from
an existing pattern (and why).
-->
