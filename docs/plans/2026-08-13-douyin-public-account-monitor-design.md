# Douyin Public Account Monitor — Design

**Date:** 2026-08-13

**Status:** Approved for a three-account, two-week pilot

**Audience:** Internal company users only

## 1. Purpose and boundaries

Build a small internal web application that monitors approximately 100 unrelated public Douyin accounts. Once a week, it discovers public videos published during the previous 90 days and records the engagement figures visibly presented on Douyin's web pages:

- public video count shown on the profile;
- video title, URL, identifier, and publication time;
- likes;
- collections/favorites, when visibly available;
- comments;
- shares/forwards, represented in the product as **visible share count**;
- the time at which each observation was made.

The system stores cumulative snapshots. Week-over-week figures are calculated as the difference between two successful observations; they are not event-level measurements or an exact natural-week attribution.

The first release does not attempt to obtain view counts, private creator analytics, comment contents, follower identities, or data not displayed to the logged-in browser. It does not reverse private APIs, recreate Douyin signatures, solve CAPTCHAs, rotate identities, spoof devices, or circumvent access controls. A login challenge or access restriction pauses the run for manual intervention.

Douyin's current user agreement restricts crawler extraction and unauthorized statistical use. Before production or commercial use, the company must make its own legal and platform-policy assessment. Technical feasibility does not grant permission to collect or reuse the data.

## 2. Deployment architecture

The complete system runs on one always-online Mac mini:

```text
Tailscale/private network
          |
          v
Next.js dashboard -- SQLite database
          |                  ^
          |                  |
          +---- job control -+
                             |
macOS launchd -> Node.js collector -> Playwright persistent Chrome
                                      |
                                      +-> logs and failure screenshots
```

Components:

1. **Collector:** A Node.js process using Playwright and a dedicated persistent Chrome profile. The first login is completed manually. The profile is never shared with the dashboard process.
2. **Database:** SQLite in WAL mode. This is adequate for one collector, one internal dashboard, weekly writes, and the expected data volume.
3. **Dashboard:** Next.js server-rendered application with ECharts for trends and a simple internal API for account management and manual runs.
4. **Scheduler:** A macOS `launchd` agent starts the weekly collector. The job also can be initiated by the dashboard, but concurrent runs are prevented with a database lease.
5. **Access:** One internal application account. The dashboard binds to the private interface or localhost and is reached through Tailscale; it is not exposed directly to the public internet.
6. **Artifacts:** Structured logs and failure screenshots remain on local disk with retention limits. The SQLite database is backed up daily, keeping the most recent 30 backups.

The browser remains headed during the pilot so a person can see and resolve login challenges. Headless mode may be evaluated only after the pilot demonstrates equivalent visible behavior.

## 3. Data model

### `app_users`

- `id`
- `username` (unique)
- `password_hash` (Argon2id)
- `created_at`
- `last_login_at`

Only one user is initially provisioned, but storing it normally avoids hard-coded credentials.

### `accounts`

- `id`
- `nickname`
- `profile_url` (unique)
- `douyin_account_id` (nullable until discovered)
- `enabled`
- `profile_video_count` (nullable)
- `last_scanned_at` (nullable)
- `last_scan_status`
- `created_at`, `updated_at`

`profile_video_count` means the public count displayed by Douyin. It is distinct from the number of videos tracked within the 90-day window.

### `videos`

- `id`
- `account_id`
- `douyin_video_id` (unique when available)
- `video_url`
- `title`
- `published_at`
- `first_seen_at`
- `last_seen_at`
- `tracking_until` (`published_at + 90 days`)
- `status`: `active`, `expired`, `unavailable`, or `removed`
- `consecutive_failures`

The stable Douyin video identifier is the primary deduplication key; a canonicalized URL is the fallback.

### `metric_snapshots`

- `id`
- `video_id`
- `crawl_run_id`
- `captured_at`
- `like_count` (nullable integer)
- `collect_count` (nullable integer)
- `comment_count` (nullable integer)
- `visible_share_count` (nullable integer)
- `raw_like_text`, `raw_collect_text`, `raw_comment_text`, `raw_share_text`
- `capture_status`: `success`, `partial`, or `failed`
- `quality_flags` (JSON array)
- unique constraint on `(video_id, crawl_run_id)`

`NULL` means absent or unparseable. Zero is stored only when the page explicitly communicates zero. Raw displayed text is retained because abbreviations such as `1.2万` are lossy; the parsed integer is an estimate unless the UI provides an exact value.

### `crawl_runs` and `crawl_errors`

`crawl_runs` records start/end time, trigger (`schedule` or `manual`), status, counts of scanned accounts and successful/partial/failed videos, and the collector version. `crawl_errors` records scope, account/video references, error category, sanitized message, screenshot path, and timestamp.

Error categories include `login_required`, `challenge`, `rate_limited`, `navigation`, `page_changed`, `field_missing`, `parse_error`, and `unavailable`.

## 4. Weekly collection workflow

The collector acquires a database lease before launching. If another healthy run owns the lease, the new invocation exits without doing work.

For every enabled account:

1. Open the canonical profile page using the persistent browser session.
2. Detect account-level blockers before parsing. A login screen, CAPTCHA, or broad access restriction stops the entire run and records an actionable error.
3. Record the publicly displayed profile video count if present.
4. Scroll the profile incrementally, collecting video identifiers and URLs. Stop after reaching content confidently older than 90 days, or a configured safety limit.
5. Upsert newly discovered videos and refresh metadata for known videos.
6. Select active videos with `published_at >= now - 90 days` for metric capture.
7. Open each selected video at a conservative pace and read only the metrics displayed in the rendered page.
8. Normalize displayed counts, retain raw text, assign quality flags, and atomically insert the snapshot.
9. Continue after isolated video failures. Stop the run when failures indicate a systemic condition such as login expiration, a challenge, or selectors failing across several consecutive pages.

Videos passing the 90-day boundary become `expired`; their metadata and snapshots are retained, but they are no longer opened. If an active video cannot be found on the profile, it is not immediately marked deleted because feeds may be incomplete or reordered. Repeated direct-page failures across separate runs are required before assigning `removed` or `unavailable`.

The collector uses bounded waits and visible page state instead of arbitrary long sleeps. Timing includes modest jitter, but the system does not employ proxy rotation or identity evasion. Screenshots are captured only for failures and redact or avoid authentication-sensitive areas where practical.

## 5. Metrics and quality rules

Dashboard deltas are computed between the latest two successful or partial snapshots for the same video:

```text
weekly net change = current cumulative value - previous cumulative value
```

Rules:

- A delta is `NULL` if either side is `NULL`.
- Negative changes are retained and flagged; they may reflect removed engagement, platform correction, approximate display text, or a parsing problem.
- The dashboard labels the share measure “页面可见分享量 / Visible shares.” It does not claim equivalence to a creator-backend forward metric.
- The dashboard displays capture timestamps next to deltas so users understand the actual interval.
- If the page shows abbreviated figures, the UI displays the original text alongside the normalized estimate where precision matters.
- A profile's “recent video count” is derived from stored active videos, while “public video count” is the separately observed profile value.
- Publication time and observation time are separate. The system does not infer a video edit/update time because that information is not reliably public.

Page selectors are centralized behind extraction adapters. Each adapter returns both data and evidence about which UI element produced it. Fixture-based parser tests cover Chinese count formats, missing fields, zero values, and UI variants.

## 6. Dashboard

The internal dashboard contains:

1. **Login:** A single username/password form with rate limiting. Passwords use Argon2id; sessions use signed, `HttpOnly`, `SameSite=Strict`, secure cookies.
2. **Overview:** Enabled accounts, tracked 90-day videos, new videos since the previous run, latest-run health, and metric net changes.
3. **Accounts:** Searchable account list showing public video count, 90-day tracked count, last scan, and status.
4. **Account detail:** Weekly trends, recent videos, aggregate net changes, and links to individual video records.
5. **Video detail:** Publication time, observation history, cumulative metric lines, raw visible values, net changes, and quality warnings.
6. **Run health:** Run history, errors, missing fields, screenshots, and instructions for restoring the browser login.
7. **Administration:** Add, edit, enable, or disable profile URLs; trigger a manual run; no arbitrary URL fetching.
8. **CSV export:** Filtered internal export of accounts, videos, and snapshots.

The UI is desktop-first but responsive enough for status checks on a phone. It should never embed or redistribute video files; links direct the authorized employee to Douyin.

## 7. Reliability, security, and operations

- Use a dedicated non-admin macOS user for the service when practical.
- Keep the Chrome profile, database, screenshots, and backups readable only by that user.
- Store application secrets in environment configuration or macOS Keychain, never source control.
- Sanitize logs so cookies, storage values, credentials, and full page payloads are not written.
- Apply SQLite migrations and integrity checks before collection.
- Back up using SQLite's safe backup mechanism, then test restoration during the pilot.
- Maintain a disk-retention policy: 30 database backups, 30 days of ordinary logs, and 60 days of failure screenshots.
- Add health indicators for last successful run, lease age, database backup age, and browser-login state.
- Prevent Dashboard-triggered process injection: manual runs call a fixed command with no user-supplied shell arguments.

The system must degrade honestly. If a metric disappears from the page, it becomes `NULL` and creates a warning rather than silently carrying forward the previous value.

## 8. Testing and pilot

### Preflight

Use three accounts and three to five videos per account. In headed Chrome, validate profile discovery, the 90-day cutoff, stable video IDs, publication-time parsing, and all four visible metrics. Compare every captured value against what an employee sees.

### Automated tests

- Unit tests for Chinese number normalization and date parsing.
- DOM-fixture tests for extraction adapters and missing-field behavior.
- Database tests for idempotent upserts, uniqueness, expiration, deltas, and negative-value flags.
- Integration tests against saved fixtures, not live Douyin, in routine CI.
- Authentication tests for password verification, session expiry, and rate limiting.
- Backup-and-restore test with row-count and integrity verification.

### Two-week pilot acceptance criteria

- No obvious missed recent videos in the three selected profiles.
- At least 95% correct parsing for metrics visibly shown on sampled pages.
- One video failure does not abort unrelated collection.
- Login expiration or a challenge is detected and safely stops the run.
- Missing data is stored as `NULL`, never fabricated as zero.
- The second snapshot produces correct net changes from the first.
- Failure screenshots and run diagnostics are sufficient for manual recovery.
- Database backup restores successfully.

After acceptance, import the remaining accounts gradually in batches, watching run time and challenge frequency. If stable collection cannot be maintained without bypassing platform controls, the project pauses and re-evaluates authorization or licensed data sources rather than escalating evasion.

## 9. Deliberately deferred work

- Tracking more than 90 days per video.
- Daily collection.
- View counts or creator-only analytics.
- Public hosting and multi-tenant access.
- Enterprise SSO and complex roles.
- Mobile app development.
- Notifications beyond the on-dashboard run status.
- CAPTCHA solving, proxy pools, fingerprint manipulation, or private API reverse engineering.
- Automated interpretation of comment content.

These items are excluded from the pilot to keep the system small, auditable, and aligned with the agreed operating constraints.
