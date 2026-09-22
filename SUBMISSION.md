# TrafficPulse Visualizer — Hackathon Submission

**Track:** Track 1 — Livepeer Agent Builder
**Repo:** https://github.com/Dprof-code/traffic-pulse-ai-agent-with-visuals
**Live A2A endpoint:** `POST http://localhost:4111/a2a/agent/trafficAgent` (see `DEMO_SCRIPT.md` for exact commands)

## What it is

TrafficPulse is a Mastra AI agent that reports real-time traffic status between two points over an Agent-to-Agent (A2A) JSON-RPC endpoint, using the Google Routes API. This hackathon submission extends it with a **Livepeer Agent-powered visualizer**: on request, the agent generates a real image — and a short animated cinemagraph — of the current traffic condition, live, and returns both alongside the text status in the same A2A response.

Turn live traffic data into a generated visual, agent-to-agent.

## Why Livepeer Agent is central, not decorative

The visualizer isn't a bolt-on demo feature — it's the primary new capability this submission adds, and every part of its design is built around using the Livepeer Agent MCP correctly and responsibly:

- **FR-VIS-01 — Deterministic prompts:** the image and motion prompts sent to Livepeer are built from fixed lookup tables keyed on traffic status and delay bucket, never freeform LLM text. Same conditions always produce the same prompt.
- **FR-VIS-02 — Pre-flight cost gating:** before any paid Livepeer call, the tool queries Livepeer's live pricing API and checks the estimate against a configured ceiling (`MAX_RENDER_COST_USD`). A render over budget is skipped with a clear reason, and the text traffic status is still returned.
- **FR-VIS-03 — Real still-image generation:** a real Livepeer render (flux-schnell) produces the traffic image, returned as a real asset URL in the A2A response — not a placeholder or pre-rendered stock image.
- **FR-VIS-04 — Caching:** rendered assets are cached in LibSQL keyed on `(origin, destination, status, delayBucket)`, so a repeat request under unchanged conditions reuses the asset instead of re-rendering — verified to skip the Livepeer call entirely on a cache hit.
- **FR-VIS-05 — Data-driven cinemagraph:** after the still image, a second, independently-gated Livepeer call (pixverse-i2v, async job + poll) animates it. The motion character (slow drift vs. dense congested clustering) and clip duration are both derived from the real traffic status, confirmed live to produce genuinely different renders for different conditions.
- **FR-VIS-06 — Graceful degradation:** if the cinemagraph estimate exceeds budget, times out, or errors, the tool falls back to the still image rather than failing the whole request — verified by deliberately forcing all three failure modes against the live MCP.

The still-image and cinemagraph paths each carry their **own** cost gate, because a new render path doesn't inherit an existing one's safety check — a deliberate design decision, not an oversight.

## Architecture

A single Mastra agent, not a second service:

```
Client → A2A endpoint → trafficAgent
                            ├─ get-traffic tool (existing, unchanged) → Google Routes API
                            └─ visualize-traffic tool (new)
                                 ├─ LibSQL cache check
                                 ├─ Livepeer MCP: get_pricing → create_media (image)
                                 └─ Livepeer MCP: get_pricing → create_media (animate, async + poll)
```

The existing `get-traffic` tool, A2A route, and conversation memory are untouched. Callers that don't request a visualization get the exact same response shape as before this work — verified after every change that touched the agent or route.

## Engineering notes worth highlighting

- **Real MCP schema discovery, not assumed CLI names.** The TDD initially assumed tool names like `run`/`cinemagraph`/`estimate` from the SDK's CLI docs. The live MCP connection exposes a different surface entirely (`create_media` with an `action` parameter, `get_pricing`, `get_create_media` for polling) — confirmed against the live server before any code was written, not guessed.
- **The animate action's own docs contradict its parent tool's docs.** `create_media`'s top-level schema says `prompt` is unused for `action: "animate"`; `describe_capability` on the actual model shows otherwise, with prompt used as a motion descriptor. Found by checking the live schema directly rather than trusting the first doc encountered.
- **Async by necessity, not by preference.** A forced synchronous animate call hangs past the model's own measured p95 latency — the implementation submits async and polls, confirmed against real timing data, not the SDK's stated defaults.
- **Verified end-to-end across a real, varied route set** (NYC, LA, Chicago, a Michigan suburb pair), with real cache hits/misses driven by genuine live traffic fluctuation between calls, not synthetic test data.

## What's explicitly out of scope

Per the TDD's Non-Goals: multiple visual styles, a custom frontend UI (the A2A endpoint + `curl` is the intended interface), batch/scheduled visualization, and a persisted asset gallery beyond LibSQL's cache + Livepeer's own asset URLs.

## Try it

See `DEMO_SCRIPT.md` for the exact, literal commands (baseline text query, live render, cached repeat) with expected output and timing.
