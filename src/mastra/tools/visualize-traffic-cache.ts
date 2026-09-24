import { createClient, type Client } from "@libsql/client";

// FR-VIS-04: cache rendered visualizer assets keyed on (origin, destination,
// status, delayBucket) so a repeat request with an unchanged traffic status
// reuses the cached asset instead of re-rendering. Shares the same LibSQL file
// traffic-agent.ts already uses for agent memory, in its own table.

let clientPromise: Promise<Client> | null = null;

async function getClient(): Promise<Client> {
    if (!clientPromise) {
        clientPromise = (async () => {
            const client = createClient({
                url: process.env.TURSO_DATABASE_URL ?? "file:../mastra.db",
                authToken: process.env.TURSO_AUTH_TOKEN,
            });
            await client.execute(`
                CREATE TABLE IF NOT EXISTS visualization_cache (
                    origin TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    status TEXT NOT NULL,
                    delay_bucket TEXT NOT NULL,
                    image_url TEXT NOT NULL,
                    video_url TEXT,
                    rendered_cost REAL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (origin, destination, status, delay_bucket)
                )
            `);
            return client;
        })();
    }
    return clientPromise;
}

export type CachedVisualization = {
    imageUrl: string;
    videoUrl?: string;
    renderedCost?: number;
};

export async function getCachedVisualization(key: {
    origin: string;
    destination: string;
    status: string;
    delayBucket: string;
}): Promise<CachedVisualization | null> {
    const client = await getClient();
    const result = await client.execute({
        sql: `SELECT image_url, video_url, rendered_cost FROM visualization_cache
              WHERE origin = ? AND destination = ? AND status = ? AND delay_bucket = ?`,
        args: [key.origin, key.destination, key.status, key.delayBucket],
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
        imageUrl: row.image_url as string,
        videoUrl: (row.video_url as string) ?? undefined,
        renderedCost: (row.rendered_cost as number) ?? undefined,
    };
}

export async function setCachedVisualization(key: {
    origin: string;
    destination: string;
    status: string;
    delayBucket: string;
    imageUrl: string;
    videoUrl?: string;
    renderedCost?: number;
}): Promise<void> {
    const client = await getClient();
    await client.execute({
        sql: `INSERT INTO visualization_cache (origin, destination, status, delay_bucket, image_url, video_url, rendered_cost)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (origin, destination, status, delay_bucket)
              DO UPDATE SET image_url = excluded.image_url,
                            video_url = excluded.video_url,
                            rendered_cost = excluded.rendered_cost,
                            created_at = datetime('now')`,
        args: [
            key.origin,
            key.destination,
            key.status,
            key.delayBucket,
            key.imageUrl,
            key.videoUrl ?? null,
            key.renderedCost ?? null,
        ],
    });
}
