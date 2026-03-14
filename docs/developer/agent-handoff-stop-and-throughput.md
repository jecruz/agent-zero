# Agent Handoff: Stop Button and Throughput Metrics

## Scope

This handoff captures the current state of two closely related workstreams in the local `agent-zero` development environment:

1. Throughput metrics / tokens-per-second (TPS) display work
2. Planned UI and backend work for a real `Stop` button that halts active processing

It also includes local environment notes, recent branch/PR actions, and recommended next steps.

## Repositories Involved

- Main application repo:
  - `/Users/jeffreycruz/Development/agent-zero`
- Local durable runtime stack repo:
  - `/Users/jeffreycruz/Development/docker/agent0-durable`

The `agent-zero` repo is the correct place for upstreamable application changes.
The `docker/agent0-durable` repo contains local runtime wiring and should be treated as environment-specific unless intentionally upstreamed elsewhere.

## Current Goal

The immediate product/UI goal is to add a visible, trustworthy `Stop` control for the LLM so users can halt current processing without:

- deleting the chat
- resetting the full context
- sending a nudge prompt
- depending on pause semantics

The current `Nudge` function is not a stop mechanism. It kills the current task and immediately restarts the agent with the nudge prompt.

## Important Current Findings

### Nudge does not halt processing

Relevant files:

- `/Users/jeffreycruz/Development/agent-zero/agent.py`
- `/Users/jeffreycruz/Development/agent-zero/api/nudge.py`

Behavior:

- `context.nudge()` calls `kill_process()`
- then clears pause state
- then starts a new task with `fw.msg_nudge.md`

This means `Nudge` is a restart/recovery action, not a stop action.

### Pause does not terminate the active run

Relevant files:

- `/Users/jeffreycruz/Development/agent-zero/api/pause.py`
- `/Users/jeffreycruz/Development/agent-zero/agent.py`

Behavior:

- Pause sets `context.paused`
- the agent only honors it at `handle_intervention()` checkpoints
- it does not immediately terminate the active task

This is useful, but different from a true `Stop`.

### Existing terminate endpoint is not the right primitive

Relevant file:

- `/Users/jeffreycruz/Development/agent-zero/api/api_terminate_chat.py`

Behavior:

- requires API key
- removes the chat context entirely
- deletes chat persistence

This is not suitable for a UI `Stop` button because users expect `Stop` to preserve the conversation and partial output.

## Planned Stop Button Design

### UX intent

Create a dedicated `Stop` button in the chat input action row.

Expected semantics:

- `Stop`: halt current generation or tool-processing immediately, keep the chat and partial output
- `Pause Agent`: suspend at intervention checkpoints
- `Nudge`: restart the process with a nudge prompt

This keeps the controls legible and reduces accidental destructive actions.

### Recommended implementation outline

#### Frontend

Add a new action in:

- `/Users/jeffreycruz/Development/agent-zero/webui/components/chat/input/bottom-actions.html`
- `/Users/jeffreycruz/Development/agent-zero/webui/components/chat/input/input-store.js`

Notes:

- show `Stop` only while the selected context is actively running
- make it visually distinct from `Nudge`
- call a new dedicated backend endpoint
- handle optimistic disabled/loading state and failure toasts

#### Backend

Add a new endpoint, likely:

- `/Users/jeffreycruz/Development/agent-zero/api/chat_stop.py`

Suggested behavior:

- resolve current context
- call `context.kill_process()`
- set `paused = False`
- persist the current temp chat
- optionally write an info log entry such as "Generation stopped by user"
- trigger any necessary state refresh for UI listeners
- return a simple success payload

#### Constraints

The `Stop` endpoint should not:

- call `context.reset()`
- remove the chat
- clear history
- generate a replacement prompt
- reuse `nudge()`

## Throughput Metrics Work: Local State

### What was fixed locally

The local TPS work uncovered a key issue: the throughput extension was not actually loading in the runtime because it inherited from the wrong `Extension` base class.

Relevant file:

- `/Users/jeffreycruz/Development/agent-zero/extensions/python/tokens_stream_chunk/_10_throughput_metrics.py`

Local fix:

- changed import from `helpers.extension.Extension`
- to `python.helpers.extension.Extension`

This made the local extension loader discover the throughput extension again in the current local runtime branch.

### Additional local files touched for TPS

- `/Users/jeffreycruz/Development/agent-zero/extensions/python/reasoning_stream/_10_log_from_stream.py`
- `/Users/jeffreycruz/Development/agent-zero/extensions/python/response_stream/_10_log_from_stream.py`
- `/Users/jeffreycruz/Development/agent-zero/agent.py`

Local durable stack wiring:

- `/Users/jeffreycruz/Development/docker/agent0-durable/Dockerfile.yama`
- `/Users/jeffreycruz/Development/docker/agent0-durable/docker-compose.nvidia-kimi2.5-yama.yml`

### Upstreamability warning

The current local TPS implementation does not cherry-pick cleanly onto `upstream/development`.

Important discovery:

- `upstream/development` still has `reasoning_stream` and `response_stream` extensions
- but it no longer has the `tokens_stream_chunk` extension path used by the current local TPS implementation

Implication:

- the current local TPS fix is not directly ready for a new upstream PR
- it needs to be reimplemented against the current `development` branch extension architecture

## Git / PR State

### Closed PR

Old upstream PR:

- `agent0ai/agent-zero#1256`

Status:

- closed locally via GitHub CLI because it targeted `main` and bundled too many unrelated changes

Maintainer guidance from the PR discussion:

- PRs must target `development`, not `main`
- plugin/extension-oriented solutions are preferred where possible

### Local branches

In `/Users/jeffreycruz/Development/agent-zero`:

- existing local branch with TPS work:
  - `feature/throughput-metrics-dev`
- clean branch created from upstream development:
  - `codex/throughput-metrics-development`

The cherry-pick of the local TPS commit onto `codex/throughput-metrics-development` was attempted and then aborted after discovering the extension architecture mismatch. The branch is currently clean and safe to continue on.

## Recent Commits

In `agent-zero`:

- `fa76b0f9` — `Fix throughput metrics streaming extensions`

In `docker/agent0-durable`:

- `0d14dc0` — `Wire throughput metrics patches into durable stack`

These were local commits only.

## Dev Container

A new devcontainer was added to support development and testing in `agent-zero`.

Files:

- `/Users/jeffreycruz/Development/agent-zero/.devcontainer/devcontainer.json`
- `/Users/jeffreycruz/Development/agent-zero/.devcontainer/Dockerfile`
- `/Users/jeffreycruz/Development/agent-zero/.devcontainer/postCreate.sh`

Intent:

- provide a stable `/a0` workspace
- use `/opt/venv-a0/bin/python`
- install `requirements.txt` and `requirements.dev.txt`
- support `pytest` and local `run_ui.py` execution
- mount Docker socket for Docker-backed integration tasks

## Recommended Next Steps

### For the Stop Button

1. Implement `api/chat_stop.py`
2. Add `stopAgent()` to `input-store.js`
3. Add the `Stop` UI button in `bottom-actions.html`
4. Persist partial output and log a stop event
5. Test stop during:
   - reasoning stream
   - response stream
   - tool execution
   - paused state

### For Throughput Metrics Upstreaming

1. Work only on `codex/throughput-metrics-development`
2. Rebuild the TPS solution against `upstream/development`
3. Avoid depending on the removed `tokens_stream_chunk` extension path
4. Keep the diff narrowly scoped
5. Open a new PR only after the `development`-compatible version is working

### For Local Runtime Validation

Use the local durable stack in:

- `/Users/jeffreycruz/Development/docker/agent0-durable`

But keep local Docker wiring separate from any upstream Agent Zero PR.

## Short Executive Summary

- `Nudge` is not a stop action and should remain separate
- a real `Stop` button should kill the active process but preserve the chat
- the local TPS fix works against the local runtime shape, but not yet against `upstream/development`
- PR `#1256` was correctly closed
- the next product-facing feature to implement is the real `Stop` control
