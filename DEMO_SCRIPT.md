# TrafficPulse Visualizer — Live Demo Script

Literal, exact steps for the live demo. Follow this in order — nothing here is improvised. Read through once before presenting; the whole thing (including the ~30–90s live render wait) takes about 3–4 minutes.

## Pre-demo checklist (do this before you're on stage)

1. **Server running:** `npm run dev` in `traffic-pulse-ai-agent/`, confirm it prints `ready in ...ms` and no errors.
2. **Threshold set:** `.env` has `MAX_RENDER_COST_USD=1.00` (covers image + animate for any status; don't demo with a lower value or the video will be skipped).
3. **Balance check:** ask Claude Code (or check `spend_cap` via the Livepeer MCP) that there's at least a few dollars of headroom on the shared demo key. As of the last dev session, ~$97 of the $100/24h allowance remained.
4. **Guarantee a live render — clear the demo route's cache row** so Step 2 cannot accidentally hit a cached result:
   ```bash
   cd traffic-pulse-ai-agent
   node -e "
   import('@libsql/client').then(async ({ createClient }) => {
     const client = createClient({ url: 'file:./src/mastra/mastra.db' });
     await client.execute(\"DELETE FROM visualization_cache WHERE origin = 'Manhattan' AND destination = 'Brooklyn'\");
     console.log('cache cleared for demo route');
   });
   "
   ```

## Step 1 — Baseline: real-time traffic status (no visualization)

**Say:** "TrafficPulse is a Mastra agent that reports live traffic over an A2A endpoint — that part already existed. Here's a quick baseline."

```bash
curl -s -X POST http://localhost:4111/a2a/agent/trafficAgent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "demo-1",
    "method": "generate",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "What is the traffic from Manhattan to Brooklyn?"}]
      }
    }
  }'
```

**Expected output** (delay/time will vary with real traffic — that's expected and fine):

```json
{"jsonrpc":"2.0","id":"demo-1","result":{"status":{"state":"completed","message":{"parts":[{"kind":"text","text":"Moderate traffic from Manhattan to Brooklyn - 9 min delay (54 mins total)..."}]}}, ...}}
```

**Takes:** ~3–5 seconds.

## Step 2 — The live render (the actual demo)

**Say:** "Now watch it generate a real image and a short animated cinemagraph of that traffic condition, live, using the Livepeer Agent network — this is the hackathon extension. This'll take under a minute; while it runs I'll explain what's happening under the hood."

```bash
curl -s -X POST http://localhost:4111/a2a/agent/trafficAgent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "demo-2",
    "method": "generate",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Show me an image of the traffic from Manhattan to Brooklyn"}]
      }
    }
  }'
```

**While it's running (~30–90s), narrate:**
- The prompt sent to Livepeer is built from a fixed lookup table keyed on traffic status and delay bucket — never freeform LLM text, so identical conditions always produce the identical prompt (needed for the caching in a second).
- Before any paid render, the tool calls Livepeer's live pricing API and checks the estimate against a configured ceiling — twice, once for the still image, once independently for the animation, since each is its own render with its own cost.
- The animation's motion (slow drift vs. dense congested clustering) is driven by the actual traffic status, not a hardcoded default.

**Expected output** (URLs are real, freshly rendered):

```json
{"jsonrpc":"2.0","id":"demo-2","result":{"status":{"state":"completed","message":{"parts":[{"kind":"text","text":"Moderate traffic from Manhattan to Brooklyn - ... A visualization is included below.\nImage: https://agent.livepeer.org/a/...jpg\n\nVideo: https://agent.livepeer.org/a/...mp4"}]}}, ...}}
```

Open the `Image:` and `Video:` URLs in a browser tab to show the actual rendered assets.

## Step 3 — Caching, instantly (optional but recommended, ~5 seconds)

**Say:** "Same request again — this time it's instant, because it's cached."

```bash
curl -s -X POST http://localhost:4111/a2a/agent/trafficAgent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "demo-3",
    "method": "generate",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Show me an image of the traffic from Manhattan to Brooklyn"}]
      }
    }
  }'
```

**Expected:** same `Image:`/`Video:` URLs as Step 2, response in ~3–5 seconds instead of ~30–90s. If real traffic shifted status/delay-bucket between Step 2 and Step 3, this will genuinely re-render instead — that's correct behavior (different condition, different cache key), just less impressive for the demo. If time is short, skip this step.

## If something goes wrong

- **No image/video, just a skip reason:** the estimate exceeded `MAX_RENDER_COST_USD`. Say so plainly — it's the budget gate working as designed — and either raise the threshold and retry, or move on; this is a legitimate engineering point (Session 6: cinemagraph failures degrade gracefully to the text status, never a failed request).
- **Response takes noticeably longer than ~90s:** the render likely failed/timed out server-side; the tool falls back to the still image only rather than hanging — check the terminal log for `Cinemagraph skipped: ...`.
- **Text-only response with no traffic data at all:** Google Maps/Gemini API issue — check `.env` keys are valid before going live; not something to debug on stage.
