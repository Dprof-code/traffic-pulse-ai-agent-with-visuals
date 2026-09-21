# Traffic Pulse AI Agent

## Overview

This Node.js backend service leverages the Mastra AI framework to provide intelligent traffic monitoring through AI-powered agents. Built with modern AI technologies, it offers real-time traffic updates through a scalable RESTful API with Agent-to-Agent (A2A) communication protocol support.

## Features

- **Mastra AI Framework**: Built on a robust AI agent framework with support for workflows, tools, and agent orchestration.
- **Traffic Monitoring Agent**: Provides real-time traffic updates using Google Routes API with traffic-aware routing, delay calculations, and status reporting.
- **Agent-to-Agent (A2A) Protocol**: Implements JSON-RPC 2.0 compliant A2A communication for inter-agent collaboration and task delegation.
- **Intelligent Workflows**: Automated workflows for traffic analysis.
- **Memory & Persistence**: Agent conversation memory using LibSQL storage for context-aware interactions and conversation history.
- **AI Scoring & Evaluation**: Built-in scorers for tool call appropriateness, response completeness, and translation quality assessment.
- **Real-time Updates**: Support for periodic traffic updates at user-defined intervals for continuous monitoring.
- **OpenAPI Documentation**: Auto-generated API documentation with Swagger UI for easy exploration and testing.
- **Observability & Logging**: Comprehensive telemetry, AI tracing, and structured logging with Pino for production-ready monitoring.

## Getting Started

To set up the Traffic Pulse AI Agent locally, follow these steps:

### Installation

First, clone the repository and install the dependencies:

🚀 **Clone the Repository:**

```bash
git clone https://github.com/dprof-code/traffic-pulse-ai-agent.git
cd traffic-pulse-ai-agent
```

📦 **Install Dependencies:**

```bash
npm install
# or
yarn install
```

### Environment Variables

Create a `.env` file in the root directory of the project and populate it with the following required variables:

- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key with Routes API enabled.
  - _Example_: `GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX`
  - _Required APIs_: Enable the Routes API (v2) in your Google Cloud Console
- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google Generative AI API key.
  - _Example_: `GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX`

**Important**: Make sure to enable the **Routes API (v2)** in your Google Cloud Console, not the legacy Distance Matrix API.

## Usage

Once the project is installed and environment variables are configured, you can start the development server:

🚀 **Start the Development Server:**

```bash
npm run dev
```

The API will be running on `http://localhost:4111` by default. You can interact with the agents using the A2A protocol or through the Mastra server endpoints.

**Available Commands:**

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build the project for production
npm run start    # Start production server
npm run deploy   # Deploy the application
```

**Example using `curl` to interact with the Traffic Agent:**

```bash
curl -X POST http://localhost:4111/a2a/agent/trafficAgent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "generate",
    "params": {
      "message": {
        "role": "user",
        "parts": [
          {
            "kind": "text",
            "text": "What is the traffic from Manhattan to Brooklyn?"
          }
        ]
      }
    }
  }'
```

## API Documentation

### Base URL

`http://localhost:4111` (default Mastra server port)

### Swagger UI

Access the interactive API documentation at:
`http://localhost:4111/swagger`

### A2A Agent Endpoints

#### POST /a2a/agent/:agentId

**Overview**: Interacts with an AI agent using JSON-RPC 2.0 compliant Agent-to-Agent protocol.

**Path Parameters**:

- `agentId`: `string` - The ID of the agent to interact with (`trafficAgent`)

**Request** (JSON-RPC 2.0 format):

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "generate",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "What's the traffic from Times Square to Central Park?"
        }
      ]
    },
    "contextId": "optional-context-id",
    "taskId": "optional-task-id",
    "metadata": {}
  }
}
```

**Response** (JSON-RPC 2.0 format):

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "id": "task-id",
    "contextId": "context-id",
    "status": {
      "state": "completed",
      "timestamp": "2024-11-02T10:00:00.000Z",
      "message": {
        "messageId": "message-id",
        "role": "agent",
        "parts": [
          {
            "kind": "text",
            "text": "Light traffic on this route - 15 min travel time"
          }
        ],
        "kind": "message"
      }
    },
    "artifacts": [
      {
        "artifactId": "artifact-id",
        "name": "trafficAgentResponse",
        "parts": [
          {
            "kind": "text",
            "text": "Light traffic on this route - 15 min travel time"
          }
        ]
      }
    ],
    "history": [],
    "kind": "task"
  }
}
```

**Errors**:

- `400 Bad Request`: Invalid JSON-RPC 2.0 format
  ```json
  {
    "jsonrpc": "2.0",
    "id": null,
    "error": {
      "code": -32600,
      "message": "Invalid Request: jsonrpc must be \"2.0\" and id is required"
    }
  }
  ```
- `404 Not Found`: Agent not found
  ```json
  {
    "jsonrpc": "2.0",
    "id": "request-id",
    "error": {
      "code": -32602,
      "message": "Agent 'invalidAgent' not found"
    }
  }
  ```
- `500 Internal Server Error`: Server error
  ```json
  {
    "jsonrpc": "2.0",
    "id": null,
    "error": {
      "code": -32603,
      "message": "Internal error",
      "data": {
        "details": "Error message"
      }
    }
  }
  ```

## Agents

### Traffic Agent

**Purpose**: Provides real-time traffic information with delay calculations and periodic updates.

**Capabilities**:

- Real-time traffic monitoring between origin and destination
- Traffic status classification (Light, Moderate, Heavy)
- Delay time calculations in minutes
- Distance and duration estimates
- Periodic traffic updates at user-defined intervals

**Example Prompts**:

- "What's the traffic on Third Mainland Bridge?"
- "How long will it take to get from Manhattan to Brooklyn?"
- "Give me traffic updates every 30 minutes for my route to the airport"

## Workflows

### Traffic Workflow

Automated workflow that:

1. Accepts origin and destination as input
2. Fetches real-time traffic data from Google Routes API
3. Calculates delay times and traffic status
4. Returns structured traffic information

## Tools

### Traffic Tool

- **ID**: `get-traffic`
- **API**: Google Routes API v2
- **Features**: Traffic-aware routing, real-time delays, distance calculation
- **Output**: Normal time, traffic time, distance, status, delay in minutes

## Scorers & Evaluation

### Tool Call Appropriateness Scorer

Evaluates whether agents correctly use the available tools for given tasks.

### Completeness Scorer

Assesses if agent responses contain all necessary information to answer user queries.

### Translation Quality Scorer

Custom LLM-judged scorer that validates proper translation of non-English location names.

## Technologies Used

| Technology                                                                   | Description                                                          |
| :--------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/)                                               | JavaScript runtime for server-side development (>=20.9.0)            |
| [Mastra AI](https://mastra.ai/)                                              | AI agent framework for building and orchestrating intelligent agents |
| [TypeScript](https://www.typescriptlang.org/)                                | Type-safe JavaScript for robust code development                     |
| [Google Routes API](https://developers.google.com/maps/documentation/routes) | Real-time traffic and routing information                            |
| [LibSQL](https://github.com/libsql/libsql)                                   | SQLite-compatible database for agent memory and persistence          |
| [Axios](https://axios-http.com/)                                             | Promise-based HTTP client for API requests                           |
| [Zod](https://zod.dev/)                                                      | TypeScript-first schema validation library                           |
| [Pino](https://getpino.io/)                                                  | High-performance structured logging library                          |
| [Gemini 2.5 Pro](https://deepmind.google/technologies/gemini/)               | Google's advanced AI model powering agent intelligence               |

## Project Structure

```
traffic-pulse-ai-agent/
├── src/
│   └── mastra/
│       ├── index.ts                 # Main Mastra configuration
│       ├── agents/
│       │   └── traffic-agent.ts     # Traffic monitoring agent
│       ├── tools/
│       │   └── traffic-tool.ts      # Google Routes API integration
│       ├── workflows/
│       │   └── traffic-workflow.ts  # Traffic analysis workflow
│       ├── routes/
│       │   └── a2a-agent-route.ts   # A2A protocol endpoint
│       └── scorers/
│           └── weather-scorer.ts    # AI evaluation scorers
├── package.json
├── .env                             # Environment variables
└── README.md
```

## Contributing

We welcome contributions to enhance the Traffic Pulse AI Agent! If you're interested in improving this project, please follow these guidelines:

✨ Fork the repository to your GitHub account.
🌿 Create a new branch for your feature or bug fix (e.g., `git checkout -b feature/add-route-alternatives`).
🛠️ Make your changes, ensuring code quality and TypeScript type safety.
💬 Commit your changes with a clear and descriptive message (e.g., `git commit -m 'feat: Add alternative route suggestions'`).
⬆️ Push your changes to your forked repository (`git push origin feature/add-route-alternatives`).
🚀 Open a pull request against the `main` branch of this repository, detailing your changes.

### Development Guidelines

- Follow TypeScript best practices and maintain type safety
- Add appropriate error handling and logging
- Update documentation for new features
- Test agents and workflows thoroughly before submitting PRs
- Ensure environment variables are properly documented

## License

This project is licensed under the ISC License. For more details, refer to the `license` field in the `package.json` file.

## Requirements

- **Node.js**: >=20.9.0
- **NPM**: Latest version recommended
- **Google Cloud Account**: For Routes API access
- **API Keys**: Google Maps API key with Routes API v2 enabled

## Support & Resources

- [Mastra Documentation](https://docs.mastra.ai/)
- [Google Routes API Documentation](https://developers.google.com/maps/documentation/routes)
- [Agent-to-Agent Protocol Specification](https://a2a.dev/)

---

[![Node.js](https://img.shields.io/badge/Node.js-20.9+-green?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Mastra](https://img.shields.io/badge/Mastra-0.23+-purple)](https://mastra.ai/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)


/a2a/agent/:agentId'