
import { Mastra } from '@mastra/core/mastra';
import { InMemoryStore } from '@mastra/core/storage';
import { PinoLogger } from '@mastra/loggers';
import { Observability, MastraStorageExporter } from '@mastra/observability';
import { VercelDeployer } from '@mastra/deployer-vercel';

import { trafficAgent } from './agents/traffic-agent';
import { a2aAgentRoute } from './routes/a2a-agent-route';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { trafficWorkflow } from './workflows/traffic-workflow';

export const mastra = new Mastra({
  workflows: { trafficWorkflow },
  agents: { trafficAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  // In-memory storage adapter — unlike LibSQLStore's observability domain,
  // this one fully implements feedback (create/list), which the Studio UI's
  // Feedback panel calls. Non-persistent by design, matching the original
  // ":memory:" intent (see traffic-agent.ts for the persistent LibSQLStore
  // used for actual conversation memory).
  storage: new InMemoryStore(),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: new Observability({
    configs: {
      default: { serviceName: 'mastra', exporters: [new MastraStorageExporter()] },
    },
  }),
  server: {
    build: {
      openAPIDocs: true,
      swaggerUI: true,
    },
    apiRoutes: [a2aAgentRoute]
  },
  bundler: {
    externals: ["axios"],
  },
  deployer: new VercelDeployer({
    studio: true,
  }),
});
