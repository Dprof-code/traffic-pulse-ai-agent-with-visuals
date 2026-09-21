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

// Cinemagraph motion parameters (FR-VIS-05, TDD §7.2). The animate model's own
// schema (confirmed live via describe_capability) takes `prompt` as a motion
// descriptor for the clip — not the still-image subject — plus `duration` in
// seconds. Keyed on status only, matching the TDD §7.2 table exactly.
const MOTION_DESCRIPTORS: Record<TrafficStatus, string> = {
    "Light traffic": "slow, smooth camera drift, gentle continuous motion",
    "Moderate traffic": "moderate motion with a mild stutter, vehicles inching forward",
    "Heavy traffic": "dense, congested motion, vehicles clustered and barely moving",
};

const MOTION_DURATIONS: Record<TrafficStatus, number> = {
    "Light traffic": 4,
    "Moderate traffic": 6,
    "Heavy traffic": 8,
};

export function buildMotionPrompt(input: { status: TrafficStatus }): string {
    return MOTION_DESCRIPTORS[input.status];
}

export function getMotionDuration(input: { status: TrafficStatus }): number {
    return MOTION_DURATIONS[input.status];
}
