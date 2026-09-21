// Deterministic prompt construction for the traffic visualizer (FR-VIS-01, TDD §5.3).
// Status/delay -> prompt fragments are fixed lookup tables, never freeform/LLM text,
// so the same (status, delayBucket) always yields the same prompt (caching + demo reliability).

export type TrafficStatus = "Light traffic" | "Moderate traffic" | "Heavy traffic";
export type DelayBucket = "0-5" | "5-15" | "15+";

const STATUS_ADJECTIVES: Record<TrafficStatus, string> = {
    "Light traffic": "free-flowing",
    "Moderate traffic": "moderately congested",
    "Heavy traffic": "heavily congested, bumper-to-bumper",
};

const DELAY_DESCRIPTORS: Record<DelayBucket, string> = {
    "0-5": "minimal delay",
    "5-15": "noticeable delay",
    "15+": "severe delay",
};

// Fixed, not derived from the wall clock — a live time-of-day would make the prompt
// drift for identical (status, delayBucket) inputs, breaking the FR-VIS-01/FR-VIS-04
// determinism the cache key relies on.
const TIME_OF_DAY = "daytime";
const ROAD_TYPE = "urban";

export function getDelayBucket(delayMinutes: number): DelayBucket {
    if (delayMinutes < 5) return "0-5";
    if (delayMinutes < 15) return "5-15";
    return "15+";
}

export function buildTrafficPrompt(input: { status: TrafficStatus; delayMinutes: number }): string {
    const statusAdjective = STATUS_ADJECTIVES[input.status];
    const delayDescriptor = DELAY_DESCRIPTORS[getDelayBucket(input.delayMinutes)];

    return `${TIME_OF_DAY} aerial view of an ${ROAD_TYPE} highway, ${statusAdjective} traffic, ${delayDescriptor}, photorealistic`;
}
