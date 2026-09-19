/**
 * FlowForge - Workflow Service
 * Handles CRUD operations, state persistence (in-memory + JSON file backup),
 * and initial demonstration workflow generation.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'workflows.json');

// Default Demonstration Workflow as defined in FlowForge specifications
const DEFAULT_DEMO_WORKFLOW = {
  id: 'wf-demo-github-triage',
  name: 'GitHub Issue AI Triage & Alert',
  description: 'Ingests new GitHub issues, classifies priority and type via AI, routes bugs to Discord and other issues to Email.',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: [
    {
      id: 'trigger-1',
      type: 'github_issue',
      label: 'GitHub Issue Created',
      position: { x: 80, y: 180 },
      config: {
        repository: 'acme/flowforge-app',
        event: 'issues.opened',
        branch: 'main'
      }
    },
    {
      id: 'ai-1',
      type: 'ai_classifier',
      label: 'AI Issue Classifier',
      position: { x: 420, y: 180 },
      config: {
        model: 'gpt-4o-mini',
        task: 'classify_issue',
        outputFields: ['type', 'priority', 'summary', 'reason']
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      label: 'Is Bug?',
      position: { x: 760, y: 180 },
      config: {
        field: 'type',
        operator: 'equals',
        value: 'bug'
      }
    },
    {
      id: 'discord-1',
      type: 'discord',
      label: 'Discord Dev Channel',
      position: { x: 1100, y: 90 },
      config: {
        channel: 'dev-alerts',
        mentionOnHighPriority: true,
        webhookUrlEnv: 'DISCORD_WEBHOOK_URL'
      }
    },
    {
      id: 'email-1',
      type: 'email',
      label: 'Email Product Lead',
      position: { x: 1100, y: 280 },
      config: {
        recipient: 'lead@company.com',
        subject: '[Feature/Question] New Issue Logged'
      }
    }
  ],
  edges: [
    {
      id: 'e-trigger-ai',
      source: 'trigger-1',
      target: 'ai-1',
      sourceHandle: 'out',
      targetHandle: 'in'
    },
    {
      id: 'e-ai-cond',
      source: 'ai-1',
      target: 'condition-1',
      sourceHandle: 'out',
      targetHandle: 'in'
    },
    {
      id: 'e-cond-discord',
      source: 'condition-1',
      target: 'discord-1',
      sourceHandle: 'true',
      targetHandle: 'in',
      label: 'True (BUG)'
    },
    {
      id: 'e-cond-email',
      source: 'condition-1',
      target: 'email-1',
      sourceHandle: 'false',
      targetHandle: 'in',
      label: 'False (OTHER)'
    }
  ]
};

class WorkflowService {
  constructor() {
    this.workflows = new Map();
    this.initStorage();
  }

  initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          list.forEach(wf => this.workflows.set(wf.id, wf));
          return;
        }
      }

      // Seed with default demonstration workflow
      this.workflows.set(DEFAULT_DEMO_WORKFLOW.id, JSON.parse(JSON.stringify(DEFAULT_DEMO_WORKFLOW)));
      this.persist();
    } catch (err) {
      console.warn('[WorkflowService] File storage init fallback to memory:', err.message);
      this.workflows.set(DEFAULT_DEMO_WORKFLOW.id, JSON.parse(JSON.stringify(DEFAULT_DEMO_WORKFLOW)));
    }
  }

  persist() {
    try {
      const list = Array.from(this.workflows.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[WorkflowService] Failed to persist workflows to disk:', err.message);
    }
  }

  getAllWorkflows() {
    return Array.from(this.workflows.values()).map(wf => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      status: wf.status,
      nodeCount: wf.nodes ? wf.nodes.length : 0,
      edgeCount: wf.edges ? wf.edges.length : 0,
      createdAt: wf.createdAt,
      updatedAt: wf.updatedAt
    }));
  }

  getWorkflowById(id) {
    return this.workflows.get(id) || null;
  }

  createWorkflow(payload) {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newWorkflow = {
      id,
      name: payload.name || 'Untitled Workflow',
      description: payload.description || '',
      status: payload.status || 'draft',
      nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
      edges: Array.isArray(payload.edges) ? payload.edges : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, newWorkflow);
    this.persist();
    return newWorkflow;
  }

  updateWorkflow(id, payload) {
    const existing = this.workflows.get(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      name: payload.name !== undefined ? payload.name : existing.name,
      description: payload.description !== undefined ? payload.description : existing.description,
      status: payload.status !== undefined ? payload.status : existing.status,
      nodes: Array.isArray(payload.nodes) ? payload.nodes : existing.nodes,
      edges: Array.isArray(payload.edges) ? payload.edges : existing.edges,
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, updated);
    this.persist();
    return updated;
  }

  deleteWorkflow(id) {
    const exists = this.workflows.has(id);
    if (!exists) return false;
    this.workflows.delete(id);
    this.persist();
    return true;
  }

  resetDemoWorkflow() {
    const clone = JSON.parse(JSON.stringify(DEFAULT_DEMO_WORKFLOW));
    clone.updatedAt = new Date().toISOString();
    this.workflows.set(clone.id, clone);
    this.persist();
    return clone;
  }
}

module.exports = new WorkflowService();
