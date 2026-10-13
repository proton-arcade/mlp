---
title: Rate Limits and Quotas
description: The rate limits, usage credits, and storage quotas that apply to Mixt.js apps, and how to handle hitting them.
---

<div class="info">This is an advanced reference. Mixt.js already handles the common cases: a call that runs out of credit or storage shows the user an upgrade prompt automatically. Read on if you expect high request volumes or want to handle limit errors yourself.</div>

Three independent checks can stop a request:

| Check             | What it limits                                                   | Resets                                  | Error                         |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| **Usage credit**  | What usage costs (egress, KV, storage operations, workers)   | Monthly, per plan                       | `402` `insufficient_funds`    |
| **Rate limit**    | How many requests are made in a window                           | Rolling window (10 s, 1 min or 1 h)     | `429` `too_many_requests`     |
| **Storage quota** | How many bytes are stored                                        | When the user deletes files or upgrades | `413` `storage_limit_reached` |

Credit doesn't buy rate-limit headroom, and an empty balance doesn't block reads that cost nothing.

## How limits are counted

Under the [User-Pays Model](/user-pays-model), limits are counted against each user's own account, so one heavy user can't use up your app for everyone else. Every limit on this page is counted in one of these scopes:

| Scope                  | What shares one budget |
| ---------------------- | ---------------------- |
| **Per user, per app**  | One user in one app. **This is the default**: a limit that names no scope uses it. The same user in another app has a separate budget. The Mixt OS desktop and API tokens count as one more app, and each [worker](/Workers/) gets its own budget too. |
| **Per user, all apps** | One user, summed across every app they use. Used for quotas on things an account keeps (subscriptions, share handles, shares per day, uploads in progress) and a few call budgets. |
| **Per app, all users** | One app, summed across all of its users. Used for things a developer publishes, such as event handlers. |
| **Per network**        | One IP address or device. Used by routes with no signed-in user, such as signed URLs and WebDAV. |

When a quota has both a per-app and an all-apps number, both apply: one app can use up to its per-app share, and all apps together can use up to the all-apps total.

Where a table shows three numbers, they are **paid / free / anonymous**. Paid is any subscription tier. Anonymous is a temporary (guest) account.

## Usage credit

Usage is charged against the account's monthly allowance at real cost.

- Every account gets a free monthly allowance ([shown in the dashboard](https://mixt.mpl/dashboard#usage)). Paid plans get more; see the [plans page](https://mixt.mpl/dashboard#billing).
- The allowance resets monthly and doesn't roll over. Purchased credits never expire and are spent after the allowance runs out.

The main costs:

- **Egress**: every byte sent to a client, on all responses, not just file downloads. This is the one developers underestimate.
- **KV and storage operations**: small per-operation costs. Reads served from cache cost a fraction of uncached reads.

## Rate limits

All rate limits are rolling windows, counted per user, per app unless a scope is given.

### Key-value store

| Limit                           | Paid | Free | Anonymous |
| ------------------------------- | ---- | ---- | --------- |
| `get` / `set` / etc. per 10 s   | 400  | 400  | 200       |
| `list` (prefix scan) per minute | 240  | 120  | 60        |
| Concurrent calls                | 30   | 15   | 8         |
| Concurrent `list`               | 5    | 3    | 2         |

Sizes are the same for every account:

| Size                      | Limit                                     |
| ------------------------- | ----------------------------------------- |
| Key                       | 1 KB                                      |
| Value                     | 400 KB                                    |
| Any number inside a value | ±9,007,199,254,740,991 (2<sup>53</sup>−1) |
| Path nesting (`add`/`update`/`incr`/`decr`/`remove`) | 31 levels |
| Path segments in one call, all paths together | 1,500 |
| Nesting depth of a value, counting its path | 32 levels |

A key or value over its size limit is rejected. A number out of range is not rejected: it's stored clamped to the bound, and `NaN` is stored as `null` (as `JSON.stringify()` does). This applies at any depth inside an object or array. Store values that must stay exact past 2<sup>53</sup>, such as large ids or running totals, as strings.

A path such as `a.b.c` may chain at most 31 levels, and one call's paths at most 1,500 segments together. All of a call's paths go into one write of limited size, so in practice a call fits about 140 short paths (about 60 for `incr` and `decr`), fewer when the paths are long. A value nests at most 32 levels deep: the stored value is the first level, and each object or array inside it, or path segment above it, adds one, so `{ a: { b: 1 } }` stored with `set()` is 3 levels deep and written by `update()` at `x.y` is 5; `add()` counts the list it appends to as one more. Past any of these, the call rejects with `bad_request`.

Each call is also capped, the same for every account:

| Per call                    | Limit |
| --------------------------- | ----- |
| Keys in one `get()`         | 1,000 |
| Items in one batch `set()`  | 1,000 |
| `limit` on `list()`         | 1,000 |
| `offset` on `list()`        | 5,000 |

A `get()` or batch `set()` over its cap, or an `offset` over 5,000, is rejected with `bad_request` and nothing is read or written. A `limit` over 1,000 is lowered to 1,000, and the page's `cursor` picks up from there.

### Filesystem

Per minute unless stated:

| Operation                                 | Paid  | Free  | Anonymous |
| ----------------------------------------- | ----- | ----- | --------- |
| `stat`                                    | 1,200 | 600   | 300       |
| `readdir`                                 | 600   | 300   | 120       |
| `readdir` burst (per 10 s)                | 120   | 60    | 30        |
| `read`                                    | 600   | 300   | 120       |
| `write`                                   | 300   | 120   | 30        |
| Multipart upload calls                    | 2,400 | 1,200 | 600       |
| Mutations (mkdir/rename/delete/move/copy) | 1,200 | 900   | 600       |
| Mutations, sustained (per hour)           | 6,000 | 3,000 | 1,800     |
| Search                                    | 60    | 30    | 10        |
| `space()`                                 | 60    | 30    | 15        |
| Sign a URL                                | 300   | 150   | 60        |

| Concurrency | Paid | Free | Anonymous |
| ----------- | ---- | ---- | --------- |
| `read`      | 10   | 5    | 3         |
| `write`     | 15   | 6    | 3         |
| Search      | 5    | 2    | 2         |

| Limit | Value | Scope |
| ----- | ----- | ----- |
| Uploads in progress | 10,000 | Per user, all apps |
| Entries in one `readdir` response | 10,000 (1,000 per page by default when paginated or `recursive`) | Per request |
| Levels a `recursive` `readdir` descends | 10 | Per request |
| Files and folders in one `startBatchWrite`, `completeBatchWrite` or `batchWrite` | 500 | Per request |
| Entries in one `/sign` request | 500 | Per request |
| Part numbers in one `signMultipartParts` | 10,000 | Per request |
| Legacy `/batch` request | 256 multipart parts (fields and files combined) or 256 JSON operations, 64 files, 100 MiB per file, 1 MiB per field, 256 MiB in total | Per request |
| Signed-URL reads | 3,000/min | Per network |
| Signed-URL writes | 600/min | Per network |
| Signed-URL concurrent requests | 60 | Per network |
| `getReadURL()` (shared with all access-token creation) | 20/hour | |
| `revokeReadURL()` | 60/min | |

Non-write operations (mkdir/shortcut/move/delete) inside a legacy `/batch` request also count against the Mutations limits above.

A request over one of the per-request caps fails as a whole before any item is processed, with `400 bad_request` (`413` for legacy `/batch`). `mixt.fs.upload()` already splits larger uploads into requests of 500.

An upload is in progress from `startWrite`/`startBatchWrite` (which `mixt.fs.upload()` and `mixt.fs.write()` use) until it completes, is cancelled, or expires. The count includes uploads by collaborators into the account's folders. Over the limit, new uploads fail with `429 too_many_requests` until some finish.

The Mixt OS desktop makes PDF upload thumbnails locally within these budgets. Going over one skips the preview; the upload itself is unaffected.

| PDF thumbnail | Limit |
| --- | --- |
| Input PDF size | 20 MiB |
| PDF renderers per desktop page | 1 at a time |
| Preparation per upload, including queued PDFs | 5 seconds from the first eligible PDF |
| Renderer lifetime per PDF, including loading and cleanup | 4 seconds |
| Embedded image or intermediate canvas area | 4,194,304 pixels |
| Image resize budget passed to PDF.js | 16 MiB |
| Output | First page, at most 128 × 128 pixels, aspect ratio preserved |
| Thumbnail payload | 2 MiB |
| Thumbnail transfer | 5 seconds each |

### Permissions

| Limit | Value |
| ----- | ----- |
| Grant / revoke calls | 60/min |
| Permissions per grant, revoke, or access-token request | 16 |
| `extra` / `meta` on a grant or access-token permission | 4 KiB each |
| Filesystem entries one `create` grant may create per request | 4 |
| Path depth a `create` grant may create below the home directory | 16 components |

The last two apply to an `fs:` permission request for a path that doesn't exist yet, which is [created on approval](/Perms/request/#creating-a-path-on-request) along with any missing parent directories, unless `create: false` is passed.

### WebDAV

| Limit | Value | Scope |
| ----- | ----- | ----- |
| Requests | 600/min | Per network |
| Concurrent requests | 10 | Per network |
| Failed sign-ins | 10 per 15 min | Per account being signed into |
| Failed sign-ins | 50 per 15 min | Per network |

Successful sign-ins don't count. Over either sign-in limit, `dav` answers `429` until the window passes, even for the right password, so a client retrying a stale password keeps itself locked out: fix the password, then wait. This only affects `dav`; the desktop, the API and `mixt.auth` keep working.

For long-lived mounts, sign in with a `-token` username and an API token as the password. That skips the per-account sign-in limit, and the token can be revoked from the dashboard without changing the account password.

### Sites and workers

| Limit                               | Paid | Free | Anonymous |
| ----------------------------------- | ---- | ---- | --------- |
| Subdomain reads per 10 s            | 200  | 200  | 100       |
| Subdomain `create` per minute       | 120  | 60   | 30        |
| Concurrent subdomain calls          | 20   | 10   | 5         |
| Worker metadata reads per minute    | 600  | 300  | 150       |
| Worker `create` (deploy) per minute | 120  | 80   | 40        |
| Worker `destroy` per minute         | 30   | 20   | 10        |
| Concurrent worker calls             | 10   | 5    | 3         |
| Concurrent deploys                  | 5    | 2    | 2         |

### Apps

| Operation                                                                    | Paid      | Free      | Anonymous |
| ---------------------------------------------------------------------------- | --------- | --------- | --------- |
| `mixt.apps.get()` / `mixt.apps.list()`                                     | 100/10 s  | 100/10 s  | 50/10 s   |
| REST reads (`GET /apps`, `GET /apps/:names`, `POST /query/app`, record open) | 1,800/min | 1,800/min | 1,800/min |
| Writes (create, update, delete)                                              | 240/min   | 120/min   | 60/min    |

| Limit                                                              | Value                           | Scope       |
| ------------------------------------------------------------------ | ------------------------------- | ----------- |
| `nameAvailable`                                                    | 60/min                          |             |
| App icon                                                           | 12,000/min                      | Per network |
| App landing page (`/app/<name>`, `/desktop/app/<name>`)            | 600/min                         | Per network |
| Names per batch app lookup (`GET /apps/:names`, `POST /query/app`) | 200, up to 200 characters each  |             |
| `metadata`                                                         | 16 KiB, measured as JSON        |             |
| `filetypeAssociations`                                             | 200 entries, 60 characters each |             |

An app's `name` and `title` may be up to 100 characters and its `description` up to 7,000. A create or update over any of these is rejected with `400 bad_request`; nothing is truncated.

### Profiles

| Limit                      | Value |
| -------------------------- | ----- |
| `getProfile` reads         | 120/min, per network |
| Profile writes             | 30/min |
| Profile picture (data URL) | 512 KiB |
| Display name               | 64 characters |
| Bio                        | 280 characters |

Another user's profile is readable only while that user is on a paid plan. Owners can always read and write their own.

### Sharing

| Limit                                                           | Value | Scope |
| --------------------------------------------------------------- | ----- | ----- |
| `share` / `revoke` calls                                        | 60/min, 500/day | |
| Reads (`getShares`, `listShared`, `listSharedByMe`)             | 600/min | |
| New shares                                                      | 200/day | Per user, all apps |
| Recipients per request                                          | 10 | |
| Items per request                                               | 50 | |

- All share-listing reads spend one budget, including `stat()` with `returnShares` (on top of its own `stat` budget).
- A new share gives someone access they didn't have. Changing the mode of an existing share, or re-sharing something the recipient already has, is free. Over the daily limit, `share` fails with `share_daily_limit_reached`.
- Sharing with **anyone with the link** ([`mixt.fs.share()`](/FS/share/) with `{ anyone: true }`) requires a paid plan. A free account gets `subscription_required`, and the link stops working while the owner's plan has lapsed. Sharing with named people and teams is open to every account.

The notification and email that tell a recipient about a share have their own limits:

| Announcement                     | Limit                        |
| -------------------------------- | ---------------------------- |
| From one sender to one recipient | 1 per 15 minutes, 20 per day |
| To one recipient, from anyone    | 10 per hour, 50 per day      |

Over these, **the share still succeeds**; only the announcement is skipped. The recipient's notification still updates and groups senders ("alice and bob shared 5 items with you"). Emails triggered for one recipient within 5 seconds are sent as one digest.

Recipients are notified in-app only; share notifications are not sent by email. Recipients can block shares from one sender or from everyone (**Settings → Security → Blocked people**); the sender's `share` then fails with `recipient_not_accepting_shares`.

### Teams

Available only where the deployment has teams turned on; elsewhere `mixt.teams` rejects with `not_found`.

| Limit                                      | Value |
| ------------------------------------------ | ----- |
| Team mutations                             | 60/min, 500/day |
| Team reads                                 | 600/min |
| Teams one account may own                  | 1 |
| Seats per team, free owner                 | 3 |
| Seats per team, paid owner                 | Set by the owner's plan; 40 if the plan sets none |
| Member password resets                     | 20/day |

The mutation and read budgets are per user, per app, not per team: administering several teams spends one budget.

- **Seats.** A seat is a Mixt OS account the team creates and its owner pays for. Over the seat limit, provisioning fails with `seat_limit_reached`; over the team limit, creation fails with `team_limit_reached`. Both errors include the limit in `fields.limit`.
- **Seat plan.** A seat on a team with no paid tier is on the `org_seat_free` plan, which gets **half** the free allowance and the free rate limits. A seat on a paid team tier gets that tier.
- **Changing the seat limit.** The limit follows the owner's plan, so upgrading raises it immediately. Lowering it never disables anyone; a team over the new limit just can't add seats until it's back under.
- **Deployment config.** `max_seats_per_team_free` and `max_seats_per_team_paid` set the two seat limits; a plan registered with `teamSeatCap` uses its own instead. `max_seats_per_team` sets one flat limit that overrides all of them. `max_teams_per_user` sets the team limit. These apply to every team on the deployment.
- **Password resets.** A reset returns a temporary password once, valid for 24 hours. Until the member sets their own password, every request except signing in fails with `password_change_required`.
- **Required 2FA.** A team can require two-factor authentication for the accounts it created (not for members who joined with their own accounts). Until a seat sets it up, every request except signing in and setting up 2FA fails with `two_factor_required`. The owner needs 2FA to turn this on, and can clear a member's second factor if they lose their device; the reset is logged, and the member sees the new state the next time they sign in.
- **Deleting a team** frees the owner's team slot but not the seats. Its accounts are disabled, not removed, and keep their files and usernames.
- **Deleting a seat** requires disabling it first (`account_must_be_disabled_first` otherwise). Deletion is permanent, with no restore window: files, username and credentials are all removed. Disabled accounts are never deleted automatically.
- **No sharing policy.** A team is configured only by its name, its handle, and whether its directory is open to apps. Members share like any other account.

### Events

See [Events](/Events/) for an overview, [`onLocal()`](/Events/onLocal/#gaps) for gap markers, and [`onPersistent()`](/Events/onPersistent/#suspended-subscriptions) for suspension.

#### What an account can hold

| Limit                                | Scope              | Paid | Free | Anonymous |
| ------------------------------------ | ------------------ | ---- | ---- | --------- |
| Persistent subscriptions             | Per user, all apps | 500  | 100  | 0         |
| Persistent subscriptions             | Per user, per app  | 100  | 25   | 0         |
| KV share handles                     | Per user, all apps | 512  | 200  | 0         |
| KV share handles                     | Per user, per app  | 512  | 128  | 0         |
| Session subscriptions                | Per connection     | 50   | 50   | 50        |

- Over a subscription limit: `events_subscription_limit`. Over a share-handle limit: `events_kv_handle_limit_reached`.
- Anonymous accounts get `events_durable_requires_account` for persistent subscriptions and `events_kv_handle_requires_account` for share handles.
- Unsubscribing or revoking frees a slot immediately. Revoked handles stay listed but don't count.
- A share handle minted without naming an app counts only toward the all-apps limit.

#### How many subscriptions one event reaches

Counted per event, per region:

| Limit                                  | KV, paid owner | KV, free or anonymous owner | Other events |
| -------------------------------------- | -------------- | --------------------------- | ------------ |
| Subscriptions that receive the event   | 512            | 128                         | 50           |
| Subscription filters checked           | 2,048          | 512                         | 200          |

- KV limits follow the plan of the **key's owner**, not the writer's or the subscribers'. If the owner's plan can't be looked up, the free numbers apply. A server with no metering uses the paid numbers.
- They count subscriptions, not people. A user with three tabs open counts three times.
- Past the limit, the next subscriptions get a [gap marker](/Events/onLocal/#gaps) instead of the event (up to the same number again), and any after that get nothing. With 1,100 subscriptions on a paid owner's key: 512 get the event, 512 get a gap, 76 get nothing.
- The region that handles the write delivers to every persistent subscription plus its own connected clients. Other regions deliver only to their own connected clients. So persistent subscriptions share one budget per event, while session subscriptions spread across regions can reach more in total.
- `includeValue` values are left out of every delivery for a change when more than **128** subscriptions match it (whatever the owner's plan), when the filter-check limit stops the count early, or when the value is over **16 KB**.

#### Call budgets

| Call                                              | Limit    | Scope              |
| ------------------------------------------------- | -------- | ------------------ |
| `subscribe`                                       | 60/min   | Per user, all apps |
| `unsubscribe`                                     | 600/min  | Per user, all apps |
| Acknowledgements                                  | 600/min  | Per user, all apps |
| Share-handle mint / revoke                        | 60/min   | Per user, all apps |
| Handler publish / remove                          | 60/min   | Per user, all apps |
| Subscription and share-handle listings (combined) | 120/min  | Per user, per app  |
| Handler listings                                  | 120/min  | Per user, per app  |
| Events worker listings                            | 120/min  | Per user, per app  |
| `fetch()`                                         | 120/min  | Per user, per app  |

Over any of these: `too_many_requests`. Listing pages hold up to 200 items. A `fetch()` page defaults to 50 events and holds up to 200.

Unsubscribing counts toward its own `unsubscribe` limit, not the `subscribe` one.

#### Delivery

| Limit                                    | Value      | Scope                  |
| ---------------------------------------- | ---------- | ---------------------- |
| Broadcast deliveries                     | 600/min    | Per subscription       |
| `single` deliveries                      | 120/min    | Per subscription       |
| Handler runs                             | 60/min     | Per user, per app      |
| Coalescing window                        | 250 ms     | Per subscription and subject |
| Time to acknowledge a `single` delivery  | 60 seconds | Per delivery           |
| Undelivered backlog                      | 10,000     | Per subscription       |
| Undelivered backlog                      | 1,000,000  | Per region             |
| KV value inlined in a delivery           | 16 KB      | Per delivery           |

- Over a delivery rate, the event is replaced by a gap marker (`delivery_rate_limit`).
- Over the handler-run rate, a `single` delivery waits and goes out later, and a `broadcast` one runs only in connected clients. Neither counts as a handler failure.
- When a backlog is full, the oldest deliveries are dropped and replaced by one gap marker (`backlog_overflow`).

#### Handlers

| Limit                                  | Value                          | Scope              |
| -------------------------------------- | ------------------------------ | ------------------ |
| Published handlers                     | 100                            | Per app, all users |
| Source per handler                     | 64 KB                          | Per handler        |
| Source for all handlers combined       | 5 MB                           | Per app, all users |
| Handlers per `publishAll()` call       | 50                             | Per call           |
| Events worker deploys                  | 30/hour                        | Per app, all users |
| Run timeout                            | 30 seconds                     | Per run            |
| Retry delay                            | 2 seconds, doubling, up to 5 minutes | Per delivery |
| Failures in a row before suspension    | 5                              | Per subscription   |
| `user` token lifetime in the events worker | 15 minutes                 | Per run            |

Failures count as in a row until the handler takes a delivery or an hour passes without another failure; either resets the count to zero.

Over the deploy limit, deliveries stay queued and retry after the hour rolls over.

#### Handler chains

| Limit                         | Scope                          | Paid | Free |
| ----------------------------- | ------------------------------ | ---- | ---- |
| Handler runs in one chain     | Per account holding the subscription | 12 | 4 |

- A write made through a handler's `user` in the events worker, or through a token `user` creates, is one run deeper than the event that ran the handler. Writes from anywhere else start a new chain. `user.workers.create` is refused rather than counted — a handler cannot start an untracked chain through a worker of its own.
- When an event reaches the limit, the events worker runs no handler for it. A `broadcast` one still reaches connected clients without running the persistent handler; a `single` one is still offered to a connected client first and runs there. The dropped run leaves no gap marker and doesn't count as a handler failure.
- If the holder's plan can't be looked up, the free number applies. A server with no metering uses the paid number.

#### Suspended subscriptions

| Limit                              | Value |
| ---------------------------------- | ----- |
| Backlog kept                       | 100 deliveries |
| How long the backlog is kept       | 24 hours for `handler_not_found` and `failures`; 1 hour for `no_credit`; dropped immediately for `permission_revoked` |
| Suspended subscription deleted after | 30 days |

When a kept backlog expires, it's replaced by one gap marker (`suspended_backlog_expired`).

#### Subjects and context

| Limit                                    | Value |
| ---------------------------------------- | ----- |
| Subject length                           | 4,096 characters |
| Match pattern                            | 256 characters and 16 segments; one `*` per segment, one `**` in total |
| KV key indexed on                        | The first 6 `:`-segments or 160 bytes, whichever is shorter; the rest is matched as a pattern |
| `context` on a persistent subscription   | 4 KB |

Over a pattern limit: `invalid_subject_pattern`. Over the context limit: `events_context_too_large`.

#### What events cost

Deliveries are billed to the account holding the subscription:

| Line                        | Rate                       | Counted per     |
| --------------------------- | -------------------------- | --------------- |
| `events:delivery:broadcast` | 10 µ¢ ($0.10 per million)  | Delivered event |
| `events:delivery:single`    | 100 µ¢ ($1 per million)    | Delivered event |

µ¢ is a microcent (a millionth of a cent). Session subscriptions bill at the broadcast rate. Handler runs bill separately as worker usage.

Free: idle subscriptions, events a filter excluded, writes merged by coalescing, deliveries stopped by a permission check, deliveries with no client connected to receive them and no handler run, and gap markers.

When the holder's balance runs out, deliveries stop and persistent subscriptions are suspended with `no_credit`, and the holder is notified. The backlog is kept for 1 hour. Topping up resumes them within a few minutes.

### Networking

[`mixt.net`](/Networking/) sockets connect through a relay that takes a single-use token. A page fetches one token when it opens its first socket and reuses the connection for later sockets; `mixt.net.generateWispV1URL()` fetches a new one on every call.

| Limit                     | Paid | Free | Anonymous |
| ------------------------- | ---- | ---- | --------- |
| Relay tokens per minute   | 60   | 30   | 10        |

The relay checks each token against Mixt OS, at most **300 checks/min** per relay IP.

### Peer connections

| Limit                          | Paid | Free | Anonymous |
| ------------------------------ | ---- | ---- | --------- |
| Relay credentials per minute   | 30   | 10   | 5         |
| Guest grants issued per minute | 30   | 10   | 5         |

| Limit | Value | Scope |
| ----- | ----- | ----- |
| Signalling details reads | 3,000/min | Per network |
| Relay credentials for guests | 60/min | Shared by all guests of one host account |

Relay traffic a guest sends is billed to the account that issued the grant. Issue a grant for the session you mean to host and let it expire rather than reusing it.

### Live connections

| Limit                                  | Paid | Free | Anonymous |
| -------------------------------------- | ---- | ---- | --------- |
| Open realtime connections per account  | 400  | 200  | 100       |

An account can also hold at most **150** open connections from one origin, so a single page can't use up the whole allowance. Over either limit, the new connection is closed as soon as it opens; connections already open stay up.

### All driver calls

Every driver call also counts toward **8,000 calls/min**, before the per-API limits above. It only exists to catch runaway loops; a client that hits it is looping.

## Storage quota

Every account has a filesystem quota (100 MiB free; paid plans add more). It counts bytes stored, not bytes transferred, and deleting files frees space immediately. At the limit, writes fail with `413 storage_limit_reached`; reads keep working. `mixt.fs.space()` returns `{ capacity, used }`.

An upload reserves its declared size, minus the size of any file it replaces, from the moment it starts. The reservation is released when the upload completes (the real size counts instead), is cancelled, or expires (15 minutes after starting by default, at most 1 hour, plus 5 minutes' grace). An abandoned upload holds its space until it expires. A `startBatchWrite` that doesn't fit fails as a whole, up front. `space()` counts stored bytes only, not reservations.

## Request timeouts

Mixt.js stops a request that makes no progress for too long and rejects it with `code: "request_timeout"`. The clock restarts whenever the request moves: a state change, response bytes arriving, or upload progress where the runtime reports it. A download or stream that keeps moving is never cut off, however long it takes. The file contents `mixt.fs.upload()` and `mixt.fs.write()` send are not subject to this limit.

| Request                                                                                                           | Stopped after this long without progress |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Reads: read-only calls such as `mixt.kv.get()`, `mixt.kv.list()`, `mixt.apps.get()` and `mixt.hosting.list()` | 60 s                                     |
| Everything else, including writes, streamed responses and every `mixt.fs` call                         | 15 min                                   |

A read is held to 60 s only while progress can be seen: before the response headers arrive, and after them once the body has started arriving. Node.js, service workers and Mixt OS Workers report no progress for a non-streamed body, so there a read moves to the 15 min limit once its headers are in.

A read that times out is retried once. A write that times out is never retried, because the server may already have done the work: check before repeating it. A stream that stalls throws `{ message, code: "request_timeout" }` from its loop.

## What happens when you hit a limit

| Status | `code`                  | Meaning                               | What to do |
| ------ | ----------------------- | ------------------------------------- | ---------- |
| `429`  | `too_many_requests`     | Rate or concurrency limit             | Back off and retry. Windows are at most 60 s, or 1 h for sustained filesystem mutations. The uploads-in-progress limit clears only when uploads finish, are cancelled, or expire. |
| `402`  | `insufficient_funds`    | Monthly credit spent                  | The user buys credit or upgrades; the allowance resets next month. |
| `402`  | `subscription_required` | The endpoint requires a paid plan     | The user upgrades. Retrying or waiting doesn't help. |
| `413`  | `storage_limit_reached` | Storage quota reached                 | The user deletes files or upgrades. |
| none   | `request_timeout`       | No progress within the [request timeout](#request-timeouts) | Retry if the call is safe to repeat. A write may already have run. |

Errors are JSON: `{ "error": …, "message": …, "code": … }`.

### What Mixt.js already does for you

For `insufficient_funds`, `subscription_required` and `storage_limit_reached`, the SDK shows the user an upgrade dialog automatically: through `mixt.ui.requestUpgrade()` in an app, or a dialog the SDK renders on the web. The dialog names the refused call and, for a plan gate, what needs the plan (the SDK's own wording where it has one, otherwise the server's `message`).

The promise still rejects with the error above. An app that writes files should handle `storage_limit_reached` so a save doesn't fail silently, and anything running in a loop should back off on `429`.

## Checking usage from your app

- `mixt.fs.space()` → `{ capacity, used }` in bytes, live.
- `mixt.auth.getMonthlyUsage()` → month-to-date spend and remaining allowance, per API.

Total spend and remaining allowance are always current. The per-API and per-app breakdowns can lag by up to about a minute. Past 5,000 distinct APIs in a month, the rest are grouped under `other`.
