# ClipMeta — Architecture Decisions

## Storage Path Format
**Decision:** `{project_id}/{safeFilename}`
**Status:** Locked in. Do not change.
**Date:** 2026-03-15

**Rationale:**
- Already in production use — migration now = data loss risk
- Project ID (UUID) provides uniqueness without slugs
- Filenames are sanitized (lowercased, spaces → dashes, non-alphanumeric stripped)
- Readable enough for debugging, predictable for queries
- Can always add slug-prefixed paths for NEW project types post-launch if needed

**Example:** `a3f7b2c1-1234-5678-abcd-ef0123456789/drone-sunrise-4k.mp4`

**Implementation:** `/src/app/api/clips/upload-url/route.ts` — `storagePath = \`${project_id}/${safeFilename}\``

---

## No Name Field at Signup
**Decision:** Don't ask for name at signup. Use email prefix as fallback.
**Status:** Implemented.
**Date:** 2026-03-14

**Rationale:**
- Extra fields = friction = drop-off
- OAuth users get real name automatically from `user_metadata`
- Email prefix (`john` from `john@gmail.com`) is fine as a default greeting
- Users can set name in Settings when they care

---
