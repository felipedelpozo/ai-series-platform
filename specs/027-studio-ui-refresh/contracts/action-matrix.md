# Existing Action Compatibility Matrix

This inventory is the executable baseline for SC-003. Unless noted, requests use JSON bodies and
retain their existing material fields. Reads are included because list/detail continuity is part of
the user action.

| Surface        | User action          | Method   | Existing destination                                                               | Material input/result                                                     |
| -------------- | -------------------- | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Shell          | Navigate             | GET      | `/series`, `/assets`, `/prompts`, `/generations`, `/ops`, `/accounts`, `/settings` | Same route destination                                                    |
| Series         | Load list            | GET      | `/api/series`                                                                      | `series[]`                                                                |
| Series         | Create               | POST     | `/api/series`                                                                      | `{ name }`                                                                |
| Series         | Open                 | GET      | `/api/series/:id`                                                                  | `series`, `bibles`                                                        |
| Series         | Generate Bible       | POST     | `/api/series/:id/generate-bible`                                                   | Refresh selected series                                                   |
| Series         | Save Bible revision  | POST     | `/api/series/:id/bible`                                                            | Parsed Bible JSON body                                                    |
| Series         | Activate Bible       | POST     | `/api/series/bibles/:id/activate`                                                  | Refresh selected series                                                   |
| Entities       | Filter/load          | GET      | `/api/entities?seriesId=:id&type=:type`                                            | `entities[]`                                                              |
| Entities       | Create               | POST     | `/api/entities`                                                                    | `seriesId`, `type`, `name`, `data`                                        |
| Entities       | Open/version/sheets  | GET      | `/api/entities/:id`, `/api/entities/:id/sheets`                                    | Detail/version/sheets                                                     |
| Entities       | Generate reference   | POST     | `/api/entities/:id/generate`                                                       | Generation result                                                         |
| Entities       | Activate version     | POST     | `/api/entities/versions/:id/activate`                                              | Refresh entity                                                            |
| Entities       | Add sheet            | POST     | `/api/entities/:id/sheets`                                                         | `{ idempotencyKey }`                                                      |
| Entities       | Change sheet status  | PATCH    | `/api/sheets/:id/status`                                                           | `{ status }`                                                              |
| Entities       | Promote sheet        | POST     | `/api/sheets/:id/promote`                                                          | Refresh entity                                                            |
| Story State    | Load/append          | GET/POST | `/api/series/:id/story-state`                                                      | Current/history or parsed JSON body                                       |
| Plans          | Load/create          | GET/POST | `/api/series/:id/plans`                                                            | Episode number for POST                                                   |
| Plans          | Approve              | POST     | `/api/plans/:id/approve`                                                           | Refresh plans                                                             |
| Plans          | Generate scenes      | POST/GET | `/api/plans/:id/scenes`                                                            | POST starts generation; GET refreshes scenes                              |
| Plans          | Generate shots       | POST/GET | `/api/plans/:id/generate-shots`, `/api/plans/:id/progress`                         | POST `{ kind }`; GET refreshes progress                                   |
| Plans          | Open studio          | GET      | `/studio/:planId`                                                                  | Same plan ID                                                              |
| Decisions      | Load/create          | GET/POST | `/api/series/:id/decisions`                                                        | Episode number for POST                                                   |
| Decisions      | Load detail          | GET      | `/api/decisions/:id`                                                               | Candidates                                                                |
| Decisions      | Approve/reject       | POST     | `/api/decisions/:id/approve`, `/api/decisions/:id/reject`                          | Optional `{ candidateId }`; reject has no body                            |
| Loops          | Load/create          | GET/POST | `/api/series/:id/loops`                                                            | Existing loop body                                                        |
| Loops          | Branch               | POST     | `/api/series/:id/branches`                                                         | Existing branch body                                                      |
| Loops          | Plan/scenes/generate | POST     | `/api/loops/:id/plan`, `/api/loops/:id/scenes`, `/api/loops/:id/generate`          | Refresh loop after each stage                                             |
| TikTok         | Load                 | GET      | `/api/series/:id/tiktok`                                                           | Connections/publications                                                  |
| TikTok         | Save videos          | POST     | `/api/series/:id/tiktok/videos`                                                    | `{ episodeNumber, url }`                                                  |
| TikTok         | Save engagement      | POST     | `/api/series/:id/tiktok/engagement`                                                | `{ episodeNumber, source, correlationId, events }`                        |
| TikTok         | Publish              | POST     | `/api/series/:id/tiktok/publish`                                                   | `{ episodeNumber }`                                                       |
| Assets         | Filter/load          | GET      | `/api/assets?kind=&status=`                                                        | `assets[]`                                                                |
| Assets         | Open                 | GET      | `/api/assets/:id`                                                                  | asset/detail/children/generation                                          |
| Assets         | Change status        | PATCH    | `/api/assets/:id`                                                                  | `{ status }`                                                              |
| Assets         | Delete               | DELETE   | `/api/assets/:id`                                                                  | Same request after confirmation                                           |
| Prompts        | Filter/open          | GET      | `/prompts?purpose=:purpose`, `/prompts/:id`                                        | Same query or template ID                                                 |
| Prompts        | Create               | POST     | `/api/prompts`                                                                     | `{ purpose, name, template }`                                             |
| Prompt Editor  | Save                 | PATCH    | `/api/prompts/:id`                                                                 | `{ name, description, template, variables }`                              |
| Prompt Editor  | Preview              | POST     | `/api/prompts/preview`                                                             | `{ template, variables, declared }`                                       |
| Prompt Editor  | Activate version     | POST     | `/api/prompts/:id/versions/:versionId/activate`                                    | Refresh route                                                             |
| Prompt Editor  | Archive/clone        | POST     | `/api/prompts/:id/archive`, `/api/prompts/:id/clone`                               | Same request; archive confirmed                                           |
| Generations    | Filter/load          | GET      | `/api/generations?kind=&status=`                                                   | `{ jobs }`                                                                |
| Generations    | Open                 | GET      | `/api/generations/:id`                                                             | attempts/events/detail                                                    |
| Generation Lab | Load prompt/assets   | GET      | `/api/prompts`, `/api/prompts/:id`, `/api/assets?kind=image`                       | Same options/detail                                                       |
| Generation Lab | Generate             | POST     | `/api/generations`                                                                 | `{ type, templateId, variables, params, sourceAssetId?, idempotencyKey }` |
| Generation Lab | Poll                 | GET      | `/api/generations/:id`                                                             | Terminal status and asset                                                 |
| Operations     | Load/refresh         | GET      | `/api/ops/overview`, `/api/ops/failures`, `/api/ops/budget?limitUsd=10`            | Same aggregation                                                          |
| Operations     | Reprocess            | POST     | `/api/ops/jobs/:id/reprocess`                                                      | Refresh operations                                                        |
| Operations     | Cleanup              | POST     | `/api/ops/jobs/:id/cleanup`                                                        | Same request after confirmation                                           |
| Accounts       | Login/register       | POST     | `/api/auth/login`, `/api/auth/register`                                            | Existing credentials/name                                                 |
| Accounts       | Load identity        | GET      | `/api/me`                                                                          | Bearer token, user/workspaces                                             |
| Accounts       | Create workspace     | POST     | `/api/workspaces`                                                                  | Name/derived slug + Bearer token                                          |
| Episode Studio | Load scenes          | GET      | `/api/plans/:id/scenes`                                                            | scenes/shots                                                              |
| Episode Studio | Select shot/preview  | GET      | `/api/shots/:id/preview`                                                           | Selected shot preview                                                     |
| Episode Studio | Save shot            | PATCH    | `/api/shots/:id`                                                                   | Merged `data`, image/video prompts                                        |
| Episode Studio | Regenerate           | POST     | `/api/shots/:id/generate`                                                          | `{ kind }`                                                                |
| Episode Studio | Generate voice       | POST     | `/api/shots/:id/voice`                                                             | `{ text }`                                                                |
| Episode Studio | Run/load QA          | POST/GET | `/api/plans/:id/qa`                                                                | POST `{ includeAi }`; GET returns findings                                |
| Episode Studio | Resolve QA           | POST     | `/api/findings/:id/resolve`                                                        | `{ status }`                                                              |
| Episode Studio | Export               | POST     | `/api/plans/:id/export`                                                            | Open `/api/assets/:assetId/content`                                       |
