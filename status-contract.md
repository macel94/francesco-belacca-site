# Public status data contract

`status.json` is a sanitized, static artifact, not a runtime status API. The
checked-in artifact is intentionally safe:

- `sanitized: true`
- `publication_state: not_configured`
- `status: unknown`
- `uptime.state: not_configured` and `uptime.value: null`
- no publisher, timestamps, incidents, or source references

An external publisher may replace the artifact through a reviewed delivery path
only after it has produced sanitized data conforming to `status.schema.json` and
sets `sanitized: true`. The browser accepts a published artifact only when it has:

- `publication_state: published` and a supported status;
- `updated_at`, `evidence_timestamp`, and a future `valid_until`;
- a named publisher and source references;
- `human_review.status: approved` and an approval timestamp.

Uptime is optional and never inferred. It is displayed only when
`uptime.state: reported` includes a numeric value from 0 through 100, a window,
and a source reference. Otherwise the page displays `not configured`.

The status page falls back to `unknown / not configured` for a missing,
malformed, expired, or unapproved artifact. It makes no claim about uptime,
availability, incident absence, or cluster health from a page response, build
revision, or empty list.
