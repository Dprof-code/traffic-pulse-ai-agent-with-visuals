import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";
import "dotenv/config";

interface TrafficData {
    normalTime: string;
    trafficTime: string;
    distance: string;
    status: string;
    delayMinutes: number;
};

export const trafficTool = createTool({
    id: "get-traffic",
    description: "Get current traffic for a location",
    inputSchema: z.object({
        origin: z.string().describe("Origin name"),
        destination: z.string().describe("Destination name"),
    }),
    outputSchema: z.object({
        normalTime: z.string(),
        trafficTime: z.string(),
        distance: z.string(),
        status: z.string(),
        delayMinutes: z.number(),
    }),
    execute: async (ctx: any) => {
        let origin, destination;

        if (ctx.context && ctx.context.origin && ctx.context.destination) {
            origin = ctx.context.origin;
            destination = ctx.context.destination;
        }
        else if (ctx.inputData) {
            origin = ctx.inputData.origin;
            destination = ctx.inputData.destination;
        }
        else if (ctx.origin && ctx.destination) {
            origin = ctx.origin;
            destination = ctx.destination;
        } else {
            console.error("Failed to extract origin/destination from context");
            throw new Error("Missing origin or destination in context");
        }

        if (!origin || !destination) {
            throw new Error(`Missing required parameters. Origin: ${origin}, Destination: ${destination}`);
        }

        console.log(`Fetching traffic from ${origin} to ${destination}`);

        const result = await getTrafficInfo(origin, destination);
        if (!result) {
            throw new Error("Failed to fetch traffic information");
        }
        return result;
    },
});

const getTrafficInfo = async (origin: string, destination: string): Promise<TrafficData | null> => {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

    try {
        const response = await axios.post(url, {
            origin: {
                address: origin
            },
            destination: {
                address: destination
            },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            computeAlternativeRoutes: false,
            routeModifiers: {
                avoidTolls: false,
                avoidHighways: false,
                avoidFerries: false
            },
            languageCode: "en-US",
            units: "IMPERIAL"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': `${process.env.GOOGLE_MAPS_API_KEY}`,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.staticDuration'
            }
        });

        const data = response.data;

        console.log(data);

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];

            const normalDuration = parseInt(route.staticDuration?.replace('s', '') || '0');
            const trafficDuration = parseInt(route.duration?.replace('s', '') || '0');
            const delayMinutes = Math.round((trafficDuration - normalDuration) / 60);
            const distanceMeters = route.distanceMeters || 0;
            const distanceMiles = (distanceMeters * 0.000621371).toFixed(2);

            return {
                normalTime: `${Math.round(normalDuration / 60)} mins`,
                trafficTime: `${Math.round(trafficDuration / 60)} mins`,
                distance: `${distanceMiles} mi`,
                status: getTrafficStatus(delayMinutes),
                delayMinutes,
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching traffic data:", error);
        return null;
    }
}

const getTrafficStatus = (delayMinutes: number): string => {
    if (delayMinutes < 5) return "Light traffic";
    if (delayMinutes < 15) return "Moderate traffic";
    return "Heavy traffic";
}