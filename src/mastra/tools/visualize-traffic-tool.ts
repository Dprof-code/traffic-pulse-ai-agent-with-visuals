import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { MCPClient } from "@mastra/mcp";
import "dotenv/config";
import { buildTrafficPrompt, getDelayBucket } from "./prompt-tables";
import { getCachedVisualization, setCachedVisualization } from "./visualize-traffic-cache";

// FR-VIS-02/FR-VIS-03 (TDD §7.1): render is gated behind a live pre-flight cost
// estimate checked against this ceiling before any paid MCP call fires.
const MAX_RENDER_COST_USD = Number(process.env.MAX_RENDER_COST_USD ?? "0.05");

// Fixed, deterministic image model — TDD §8 non-goal rules out multiple visual
// styles, and a fixed model keeps the pre-flight estimate a simple lookup.
const IMAGE_MODEL = "flux-schnell";
const IMAGE_ASPECT_RATIO = "1:1";
// flux-schnell's "1:1" default (square_hd, ~1024x1024) is ~1 megapixel; used only
// to turn the live per-megapixel rate into a pre-flight USD estimate.
const ESTIMATED_IMAGE_MEGAPIXELS = 1;

// One client for the process lifetime — MCPClient caches the underlying transport
// per its own id, so repeated getTools() calls within a run don't reconnect.
const livepeerMcp = new MCPClient({
    id: "traffic-visualizer-livepeer",
    servers: {
        livepeer: {
            url: new URL("https://agent.livepeer.org/api/mcp/creative"),
        },
    },
});

// @mastra/mcp@1.x's wrapped tool.execute() already returns the unwrapped
// structuredContent object directly (the raw MCP content array is attached as
// a hidden, non-enumerable property). structuredContent is checked first only
// as defensive back-compat in case a tool result ever arrives in the older
// { content, structuredContent } envelope shape instead.
function extractResult(mcpResult: any): any {
    if (mcpResult?.structuredContent) return mcpResult.structuredContent;
    return mcpResult;
}

export const visualizeTrafficTool = createTool({
    id: "visualize-traffic",
    description: "Generate a traffic-condition image from a traffic result, gated by a pre-flight cost estimate",
    inputSchema: z.object({
        origin: z.string().describe("Origin name"),
        destination: z.string().describe("Destination name"),
        trafficResult: z.object({
            normalTime: z.string(),
            trafficTime: z.string(),
            distance: z.string(),
            status: z.enum(["Light traffic", "Moderate traffic", "Heavy traffic"]),
            delayMinutes: z.number(),
        }),
        animate: z.boolean().default(true),
    }),
    outputSchema: z.object({
        imageUrl: z.string(),
        videoUrl: z.string().optional(),
        cached: z.boolean(),
        estimatedCost: z.number(),
        renderedCost: z.number().optional(),
        skippedReason: z.string().optional(),
    }),
    execute: async (ctx: any) => {
        const input = ctx.context ?? ctx.inputData ?? ctx;
        const { origin, destination, trafficResult } = input;

        // FR-VIS-04: cache check before any MCP call.
        const delayBucket = getDelayBucket(trafficResult.delayMinutes);
        const cacheKey = { origin, destination, status: trafficResult.status, delayBucket };
        const cached = await getCachedVisualization(cacheKey);
        if (cached) {
            console.log(`[visualize-traffic] cache hit for (${origin}, ${destination}, ${trafficResult.status}, ${delayBucket})`);
            return {
                imageUrl: cached.imageUrl,
                videoUrl: cached.videoUrl,
                cached: true,
                estimatedCost: 0,
                renderedCost: cached.renderedCost,
            };
        }
        console.log(`[visualize-traffic] cache miss for (${origin}, ${destination}, ${trafficResult.status}, ${delayBucket})`);

        const prompt = buildTrafficPrompt({
            status: trafficResult.status,
            delayMinutes: trafficResult.delayMinutes,
        });
        console.log(`[visualize-traffic] prompt: "${prompt}"`);

        const tools = await livepeerMcp.listTools();
        const getPricing = tools["livepeer_get_pricing"];
        const createMedia = tools["livepeer_create_media"];
        if (!getPricing || !createMedia) {
            throw new Error("Livepeer MCP tools not available (expected livepeer_get_pricing and livepeer_create_media)");
        }

        // FR-VIS-02: pre-flight estimate, checked before any paid call.
        const pricing = extractResult(
            await getPricing.execute({ name: IMAGE_MODEL })
        );
        const priceRow = pricing?.capabilities?.find((c: any) => c.name === IMAGE_MODEL);
        const pricePerMegapixel = priceRow?.display_price_usd;
        if (typeof pricePerMegapixel !== "number") {
            throw new Error(`Could not resolve live pricing for capability "${IMAGE_MODEL}"`);
        }
        const estimatedCost = pricePerMegapixel * ESTIMATED_IMAGE_MEGAPIXELS;
        console.log(`[visualize-traffic] estimated cost: $${estimatedCost.toFixed(5)} (threshold $${MAX_RENDER_COST_USD})`);

        if (estimatedCost > MAX_RENDER_COST_USD) {
            return {
                imageUrl: "",
                cached: false,
                estimatedCost,
                skippedReason: `Estimated cost $${estimatedCost.toFixed(5)} exceeds MAX_RENDER_COST_USD $${MAX_RENDER_COST_USD}`,
            };
        }

        // FR-VIS-03: render the still image. max_cost_usd is a second,
        // server-side belt-and-suspenders gate on top of the check above.
        const render = extractResult(
            await createMedia.execute({
                action: "generate",
                prompt,
                model_override: IMAGE_MODEL,
                aspect_ratio: IMAGE_ASPECT_RATIO,
                max_cost_usd: MAX_RENDER_COST_USD,
                async: false,
            })
        );

        if (!render?.url) {
            throw new Error(`Livepeer render did not return an image URL: ${JSON.stringify(render)}`);
        }

        const renderedCost = render.cost_paid_usd ?? render.cost_usd_estimated ?? estimatedCost;
        await setCachedVisualization({ ...cacheKey, imageUrl: render.url, renderedCost });

        return {
            imageUrl: render.url,
            cached: false,
            estimatedCost,
            renderedCost,
        };
    },
});
