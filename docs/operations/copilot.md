# Conversational Copilot Operations

## Security boundary

- Every request is authenticated and scoped to the actor's current workspace membership.
- Cookie-authenticated commands require an exact same-origin `Origin`/`Host`; Bearer remains supported.
- Durable rate limits use workspace, actor and operation class. Forwarded IP headers are not authority.
- IDs from users, canonical text or models are candidates until server-side ownership validation.
- Logs contain correlation IDs and stable resource IDs, never tokens, raw prompts or foreign data.

## Cost and provider behavior

Real `copilot.answer` and `copilot.proposal` calls require a visible maximum quote and exact economic
confirmation for the message/draft. Usage records capture provider, model, prompt snapshot, input/output
units, duration, estimated cost and actual cost when returned. Deterministic no-provider answers do not
consume a confirmation.

Long-running media generation remains an existing asynchronous job. A paid proposal target declares
whether it is independent after editorial approval or also requires the exact application receipt.
Equivalent queued, running or reusable succeeded work is reconciled before submitting another job.

## Recovery

Clients retry with their original message, revision or command idempotency key. A timeout after apply or
job launch is resolved by reading the receipt/job before any new attempt. Operators should search by
`correlationId`, then conversation, proposal/revision, decision, application/receipt, confirmation and job
IDs in that order.

## Retention and rollback

Conversation content follows workspace lifetime. Application receipts and decisions retain only the
minimal redacted link needed to explain canonical revisions. A shorter policy requires an explicit expiry
and tested sweep; it must not delete canonical provenance.

Before production use, disabling the root/routes and dropping unused copilot tables is safe. After use,
rollback disables the feature but retains audit evidence, applied canonical revisions and the
workspace-scoped Series slug constraint. Corrective schema changes are forward fixes after legitimate
cross-workspace duplicate slugs exist.

## Validation gates

Deterministic unit, PostgreSQL integration, API, accessibility, responsive and concurrency tests never
call paid providers. A separately authorized real OpenAI query/draft smoke must pass before declaring the
new external integration complete. SC-001 and SC-008 require the recorded ten-participant usability
protocol; automation cannot replace that evidence.
