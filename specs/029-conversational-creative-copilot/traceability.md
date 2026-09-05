# Feature 029 Traceability

This matrix is maintained before implementation so every requirement and acceptance scenario has an
executable owner. `Manual gate` means the criterion cannot be honestly replaced by automated evidence.

## Functional requirements

| Requirement | Design                                        | Implementation and evidence tasks |
| ----------- | --------------------------------------------- | --------------------------------- |
| FR-001      | Root copilot and canonical links              | T034, T037, T024                  |
| FR-002      | Fixed workspace/series/episode context        | T025, T042, T045                  |
| FR-003      | Persistent visible context                    | T035, T045, T065                  |
| FR-004      | Authorization at prepare and execute          | T018, T030, T032, T068            |
| FR-005      | Read-only query path                          | T026, T046, T050                  |
| FR-006      | Mutation only through proposal                | T020, T026, T029                  |
| FR-007      | Explicit canonical target catalog             | T003, T020, T051                  |
| FR-008      | Series/Bible/entities aggregate               | T020, T022, T032                  |
| FR-009      | EpisodePlan/Scene/Shot aggregate              | T039, T043, T044                  |
| FR-010      | Proposal context, changes and dependencies    | T003, T029, T051                  |
| FR-011      | Immutable revisions                           | T019, T021, T029                  |
| FR-012      | Edit, compare and discard                     | T031, T036                        |
| FR-013      | Complete pre-approval validation              | T021, T030, T039                  |
| FR-014      | Actionable findings                           | T030, T036, T043                  |
| FR-015      | Complete canonical diff                       | T021, T030, T036                  |
| FR-016      | Explicit non-chat approval                    | T020, T031, T036                  |
| FR-017      | Exact one-use approval                        | T019, T021, T031                  |
| FR-018      | Immutable reject/discard                      | T031, T049, T052                  |
| FR-019      | Immediate apply revalidation                  | T021, T032, T047                  |
| FR-020      | Atomic canonical application                  | T012-T014, T022, T032, T044       |
| FR-021      | Idempotent application                        | T009, T022, T032, T060            |
| FR-022      | Immutable receipt                             | T019, T022, T032                  |
| FR-023      | Stale/needs-information recovery              | T021, T030, T039, T063            |
| FR-024      | Existing canonical domains only               | T005, T012-T014, T037, T044       |
| FR-025      | Bible/entities/StoryState episode context     | T038, T042, T043                  |
| FR-026      | Deep links to canonical studios               | T037, T041, T045                  |
| FR-027      | Chronological immutable retained history      | T019, T029, T060, T064, T066      |
| FR-028      | Conversation is not canon                     | T005, T025, T032                  |
| FR-029      | Explicit workflow states and safe next action | T010, T011, T035, T063            |
| FR-030      | Approval only after valid non-empty diff      | T021, T030, T031                  |
| FR-031      | Desktop chat/review panes                     | T024, T035                        |
| FR-032      | Equivalent mobile tabs                        | T024, T035, T065                  |
| FR-033      | Keyboard and assistive technology             | T024, T036, T059, T065            |
| FR-034      | No overflow at five target widths             | T024, T041, T056, T062            |
| FR-035      | Exact cost quote                              | T053, T057, T059                  |
| FR-036      | Separate economic confirmation                | T053-T059                         |
| FR-037      | Cost evidence invalidation                    | T053-T058                         |
| FR-038      | Paid-job idempotency                          | T016, T054, T057                  |
| FR-039      | Safe external errors                          | T004, T018, T068                  |
| FR-040      | Deterministic no-paid default suite           | T020-T024, T070, T071             |
| FR-041      | Mixed intent decomposition                    | T026, T046, T050                  |
| FR-042      | Revision-fixed authority and bases            | T025, T029, T030                  |
| FR-043      | Actor/workspace-bound approval                | T019, T031, T032                  |
| FR-044      | Apply-time trust revalidation                 | T032, T047, T068                  |
| FR-045      | Viewer read-only                              | T018, T047-T049, T055             |
| FR-046      | Untrusted model/user/content IDs              | T020, T025, T030, T068            |
| FR-047      | Concurrent application/job reuse              | T016, T022, T054, T060            |
| FR-048      | Scene is structured screenplay                | T014, T039, T043, T044            |
| FR-049      | Inference usage/cost attribution and quota    | T028, T053, T054, T066, T073      |
| FR-050      | Cookie same-origin and durable rate limits    | T017, T018, T055, T068            |
| FR-051      | Exact mixed approval/dependency/receipt       | T051, T053-T058                   |
| FR-052      | Client-key message/revision idempotency       | T019, T029, T060                  |

## Success criteria

| Criterion | Evidence                                                |
| --------- | ------------------------------------------------------- |
| SC-001    | T074 manual ten-participant gate                        |
| SC-002    | T020-T036, T046-T052                                    |
| SC-003    | T019, T022, T032, T039, T044                            |
| SC-004    | T021, T030-T032, T039, T043, T047                       |
| SC-005    | T008-T009, T015-T016, T022, T054, T057                  |
| SC-006    | T046-T050                                               |
| SC-007    | T053-T059, T073                                         |
| SC-008    | T074 manual timed-identification gate                   |
| SC-009    | T060-T065                                               |
| SC-010    | T024, T035-T037, T041, T056, T059, T062, T065           |
| SC-011    | T018-T020, T025, T030-T032, T047-T048, T055, T068       |
| SC-012    | T010-T011, T021-T022, T039, T047, T053-T054, T060, T068 |

## Acceptance scenarios

| Scenario                                                      | Evidence               |
| ------------------------------------------------------------- | ---------------------- |
| US1-1 collect without canon write                             | T020, T026, T029, T035 |
| US1-2 immutable edit and comparisons                          | T021, T029, T036       |
| US1-3 “adelante” is not approval                              | T020, T031, T024       |
| US1-4 atomic complete-series apply and receipt                | T022, T032, T023       |
| US1-5 reject/discard remains terminal                         | T031, T049, T052       |
| US2-1 fixed selected-series context                           | T038, T042, T045       |
| US2-2 canonical episode proposal without write                | T038-T043              |
| US2-3 continuity conflict or documented policy exception      | T039, T043             |
| US2-4 atomic episode apply and Studio link                    | T039, T041, T044-T045  |
| US2-5 stale base rejects all writes                           | T039, T043-T044        |
| US3-1 query without proposal or mutation                      | T046, T048, T050       |
| US3-2 structured supported modification proposal              | T046-T051              |
| US3-3 exact multi-resource approval                           | T047, T051-T052        |
| US3-4 return to Studio without conversation loss              | T041, T045, T065       |
| US4-1 exact visible quote                                     | T053, T055-T059        |
| US4-2 independent editorial/economic gates                    | T053-T059              |
| US4-3 concurrent retry creates one job                        | T054-T057              |
| US4-4 changed evidence requires reconfirmation                | T053-T058              |
| US5-1 ordered reconstructible history                         | T060-T065              |
| US5-2 uncertain result reconciles first                       | T060-T065              |
| US5-3 retry preserves input without duplicate revision/effect | T019, T029, T060-T065  |

## External and manual gates

- T073 is opt-in because it may spend credits, but a PASS is mandatory before claiming the new OpenAI
  integration complete. Missing credentials are `UNAVAILABLE` and blocking for that claim.
- T074 requires real participant evidence. `NOT_RUN` is allowed for a code-review PR but blocks the
  SC-001/SC-008 product-readiness claim.
