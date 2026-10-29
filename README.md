# FlowForge — Visual Workflow Automation Platform

FlowForge is a visual workflow automation platform designed to orchestrate event triggers, AI-powered reasoning, conditional branch logic, and external notifications into reliable developer pipelines.

---

## Architecture Overview

FlowForge follows a clean **3-layer architecture**:

```text
       ┌───────────────────────────────┐
       │     Frontend (Client)         │
       │   HTML5 / CSS3 / Vanilla JS   │
       │  • Visual Workflow Canvas     │
       │  • SVG Bezier Directed Edges  │
       │  • Real-time Node Inspector   │
       └──────────────┬────────────────┘
                      │ HTTP REST (Fetch API)
                      ▼
       ┌───────────────────────────────┐
       │     Backend (Server)          │
       │   Node.js / Express.js        │
       │  • /api/workflows (CRUD)      │
       │  • /api/health                │
       └──────────────┬────────────────┘
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
MongoDB (M7)     GitHub (M4)      OpenAI (M5)
                                       │
                                       ▼
                                  Discord (M6)
```

### Why this architecture? (Viva / Technical Evaluation Defense)
- **Zero unnecessary bloat**: Built with vanilla JavaScript, modern CSS, Node.js, and Express. No React virtual DOM overhead, no TypeScript build artifacts, no microservices, Kafka, or Docker.
- **Understandable Graph Model**: Workflows are modeled as a Directed Acyclic Graph (DAG) with explicit `nodes` and directed `edges` adhering strictly to Section 6 specifications.
- **Defensible Security**: External tokens (GitHub, OpenAI, Discord Webhooks) are kept strictly on the backend, protected from client inspection.

---

## Project Directory Structure

```text
Project/
├── package.json          # Node.js project manifest & dependencies
├── .gitignore            # Git exclusion rules (node_modules, .env, data/)
├── README.md             # Project documentation & runbook
│
├── server/
│   ├── server.js         # Express server entry point & route mounting
│   ├── routes/
│   │   └── workflow.routes.js     # REST API routes for /api/workflows
│   ├── controllers/
│   │   └── workflow.controller.js # Request validation & controller logic
│   ├── services/
│   │   └── workflow.service.js    # In-memory + JSON persistence engine & demo workflow
│   └── data/
│       └── workflows.json         # Local workflow persistence store
│
└── public/               # Static frontend client
    ├── index.html        # Single-Page Application (Builder, Dashboard, Health Monitor)
    ├── css/
    │   └── style.css     # Dark developer-tool design system & canvas styling
    └── js/
        └── app.js        # Graph canvas engine, SVG bezier renderer, node dragging & inspector
```

---

## Workflow Data Model (Specification Section 6)

Workflows are serialized into structured JSON:

```json
{
  "id": "wf-demo-github-triage",
  "name": "GitHub Issue AI Triage & Alert",
  "description": "Ingests new GitHub issues, classifies priority and type via AI, routes bugs to Discord and other issues to Email.",
  "status": "active",
  "nodes": [
    {
      "id": "trigger-1",
      "type": "github_issue",
      "label": "GitHub Issue Created",
      "position": { "x": 80, "y": 180 },
      "config": {
        "repository": "acme/flowforge-app",
        "event": "issues.opened"
      }
    },
    {
      "id": "ai-1",
      "type": "ai_classifier",
      "label": "AI Issue Classifier",
      "position": { "x": 420, "y": 180 },
      "config": {
        "model": "gpt-4o-mini",
        "task": "classify_issue"
      }
    },
    {
      "id": "condition-1",
      "type": "condition",
      "label": "Is Bug?",
      "position": { "x": 760, "y": 180 },
      "config": {
        "field": "type",
        "operator": "equals",
        "value": "bug"
      }
    },
    {
      "id": "discord-1",
      "type": "discord",
      "label": "Discord Dev Channel",
      "position": { "x": 1100, "y": 90 },
      "config": {
        "channel": "dev-alerts"
      }
    },
    {
      "id": "email-1",
      "type": "email",
      "label": "Email Product Lead",
      "position": { "x": 1100, "y": 280 },
      "config": {
        "recipient": "lead@company.com"
      }
    }
  ],
  "edges": [
    {
      "id": "e-trigger-ai",
      "source": "trigger-1",
      "target": "ai-1",
      "sourceHandle": "out",
      "targetHandle": "in"
    },
    {
      "id": "e-ai-cond",
      "source": "ai-1",
      "target": "condition-1",
      "sourceHandle": "out",
      "targetHandle": "in"
    },
    {
      "id": "e-cond-discord",
      "source": "condition-1",
      "target": "discord-1",
      "sourceHandle": "true",
      "targetHandle": "in",
      "label": "True (BUG)"
    },
    {
      "id": "e-cond-email",
      "source": "condition-1",
      "target": "email-1",
      "sourceHandle": "false",
      "targetHandle": "in",
      "label": "False (OTHER)"
    }
  ]
}
```

---

## Milestone Status

- [x] **Milestone 1**: Express server, static file hosting, dark developer UI, and `GET /api/health`.
- [x] **Milestone 2**: 
  - Visual workflow builder with infinite grid canvas.
  - Interactive nodes (Trigger, AI Classifier, Condition, Discord, Email).
  - SVG cubic bezier curved directed edges with arrowheads.
  - Node dragging with real-time edge recalculation.
  - Port-to-port wire drawing (with dual true/false branch ports on Condition nodes).
  - Properties Inspector for real-time node & edge configuration.
  - Workflow CRUD REST API (`GET`, `POST`, `PUT`, `DELETE /api/workflows`).
  - Workflow JSON modal with live export and clipboard copy.
  - Dashboard view with workflow cards and global statistics.
- [ ] **Milestone 3**: Workflow Execution Engine & sequential node traversal.
- [ ] **Milestone 4**: GitHub API event ingestion (Test Mode & Webhook).
- [ ] **Milestone 5**: OpenAI natural language issue classifier.
- [ ] **Milestone 6**: Discord webhook notification dispatch.
- [ ] **Milestone 7**: MongoDB database persistence.
- [ ] **Milestone 8**: Execution logs and timeline audit viewer.

---

## Running Locally

```bash
# 1. Start the Express server
npm start
# (or: node server/server.js)

# 2. Open in your browser
# Web Application: http://localhost:3000
# Workflows API:   http://localhost:3000/api/workflows
# Health API:      http://localhost:3000/api/health
``````
