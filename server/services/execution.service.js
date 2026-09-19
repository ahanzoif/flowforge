/**
 * FlowForge - Workflow Execution Engine Service (Milestone 3)
 * Orchestrates sequential and conditional graph traversal with deterministic demo simulation.
 */

class WorkflowExecutionService {
  /**
   * Validates workflow structure prior to execution
   * @param {Object} workflow
   * @throws {Error} if validation fails
   */
  validateWorkflow(workflow) {
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('Workflow validation failed: Graph contains no nodes');
    }

    // Rule 1: Node IDs must be unique
    const nodeIds = new Set();
    nodes.forEach(node => {
      if (!node.id) {
        throw new Error('Workflow validation failed: Node missing unique ID');
      }
      if (nodeIds.has(node.id)) {
        throw new Error(`Workflow validation failed: Duplicate node ID '${node.id}' found`);
      }
      nodeIds.add(node.id);
    });

    // Rule 2: Edge sources and targets must exist in nodes
    edges.forEach((edge, index) => {
      if (!edge.source || !edge.target) {
        throw new Error(`Workflow validation failed: Edge at index ${index} missing source or target`);
      }
      if (!nodeIds.has(edge.source)) {
        throw new Error(`Workflow validation failed: Edge references missing source node '${edge.source}'`);
      }
      if (!nodeIds.has(edge.target)) {
        throw new Error(`Workflow validation failed: Edge references missing target node '${edge.target}'`);
      }
    });

    // Rule 3: Must have at least one starting trigger node
    const triggers = nodes.filter(n => n.type === 'github_issue');
    if (triggers.length === 0) {
      throw new Error('Workflow validation failed: No valid trigger node (e.g. GitHub Issue) found in workflow');
    }

    return true;
  }

  /**
   * Execute a workflow by traversing its nodes from trigger to action
   * @param {Object} workflow
   * @returns {Promise<Object>} Execution result with step trace
   */
  async executeWorkflow(workflow) {
    this.validateWorkflow(workflow);

    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const steps = [];
    const visitedNodes = new Set();
    const maxSteps = 50; // Guard against infinite cyclic execution

    // Find starting trigger
    const triggerNode = workflow.nodes.find(n => n.type === 'github_issue');
    let currentNode = triggerNode;
    let selectedBranchHandle = null;

    // Execution Context (accumulates data across nodes)
    const context = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      timestamp: startedAt
    };

    try {
      while (currentNode && steps.length < maxSteps) {
        // Cycle detection in current execution path
        if (visitedNodes.has(currentNode.id)) {
          throw new Error(`Cyclic execution detected: Node '${currentNode.id}' revisited in workflow path`);
        }
        visitedNodes.add(currentNode.id);

        const stepStart = Date.now();
        const stepStartedAt = new Date().toISOString();

        // Execute node logic (simulation for Milestone 3)
        const nodeOutput = await this.executeNode(currentNode, context);

        // Update shared execution context
        if (nodeOutput && typeof nodeOutput === 'object') {
          Object.assign(context, nodeOutput);
        }

        const stepDuration = Date.now() - stepStart;
        const stepRecord = {
          nodeId: currentNode.id,
          type: currentNode.type,
          label: currentNode.label || currentNode.type,
          status: 'SUCCESS',
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          durationMs: stepDuration,
          output: nodeOutput
        };

        // If condition node, record the branch outcome
        if (currentNode.type === 'condition') {
          selectedBranchHandle = nodeOutput.branchSelected; // 'true' or 'false'
          stepRecord.branchSelected = selectedBranchHandle;
        }

        steps.push(stepRecord);

        // Determine next node in graph
        currentNode = this.getNextNode(currentNode, workflow, selectedBranchHandle);
      }

      const totalDuration = Date.now() - startTime;
      return {
        success: true,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'SUCCESS',
        startedAt,
        completedAt: new Date().toISOString(),
        duration: totalDuration,
        stepsCount: steps.length,
        steps
      };

    } catch (err) {
      const totalDuration = Date.now() - startTime;
      return {
        success: false,
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'FAILED',
        error: err.message,
        startedAt,
        completedAt: new Date().toISOString(),
        duration: totalDuration,
        stepsCount: steps.length,
        steps
      };
    }
  }

  /**
   * Execute single node behavior
   */
  async executeNode(node, context) {
    const config = node.config || {};

    // Simulate minor asynchronous processing time (50ms - 150ms)
    await new Promise(r => setTimeout(r, 60));

    switch (node.type) {
      case 'github_issue': {
        const repo = config.repository || 'acme/flowforge-app';
        return {
          issueNumber: 104,
          title: 'Login session drops unexpectedly on mobile web',
          body: 'Users report authentication tokens failing to persist across page reloads on mobile Safari and Chrome.',
          repository: repo,
          event: config.event || 'issues.opened',
          author: 'octocat',
          url: `https://github.com/${repo}/issues/104`,
          createdAt: new Date().toISOString()
        };
      }

      case 'ai_classifier': {
        // Natural language triage based on previous issue data
        const task = config.task || 'classify_issue';
        const model = config.model || 'gpt-4o-mini';

        return {
          type: 'bug',
          priority: 'high',
          summary: 'Authentication session token drop on mobile devices',
          reason: 'The issue reports unexpected token expiration and session drop during normal navigation.',
          modelUsed: model,
          taskExecuted: task,
          confidence: 0.97
        };
      }

      case 'condition': {
        const field = config.field || 'type';
        const operator = config.operator || 'equals';
        const expectedVal = String(config.value || 'bug').toLowerCase().trim();

        // Retrieve actual value from context
        const actualVal = String(context[field] || '').toLowerCase().trim();

        let isMatch = false;
        if (operator === 'equals') {
          isMatch = actualVal === expectedVal;
        } else if (operator === 'not_equals') {
          isMatch = actualVal !== expectedVal;
        } else if (operator === 'contains') {
          isMatch = actualVal.includes(expectedVal);
        } else {
          isMatch = actualVal === expectedVal;
        }

        const branchSelected = isMatch ? 'true' : 'false';

        return {
          field,
          operator,
          expected: expectedVal,
          actual: actualVal,
          isMatch,
          branchSelected
        };
      }

      case 'discord': {
        const channel = config.channel || 'dev-alerts';
        const isHigh = context.priority === 'high';
        const mention = (config.mentionOnHighPriority && isHigh) ? '@here ' : '';

        return {
          action: 'discord_webhook',
          channel,
          status: 'DELIVERED',
          messagePayload: {
            content: `${mention}🚨 **NEW ${String(context.type || 'ISSUE').toUpperCase()} ALERT**`,
            embeds: [
              {
                title: context.title || 'Untitled Issue',
                description: context.summary || context.body || 'No description provided.',
                fields: [
                  { name: 'Repository', value: context.repository || 'N/A', inline: true },
                  { name: 'Priority', value: (context.priority || 'NORMAL').toUpperCase(), inline: true },
                  { name: 'Classification', value: (context.type || 'N/A').toUpperCase(), inline: true }
                ]
              }
            ]
          }
        };
      }

      case 'email': {
        const recipient = config.recipient || 'lead@company.com';
        const subject = (config.subject || '[FlowForge Alert] New Issue')
          .replace('{{issue.title}}', context.title || 'New Issue');

        return {
          action: 'email_dispatch',
          recipient,
          subject,
          status: 'SENT',
          bodySummary: `Issue #${context.issueNumber || 'N/A'} - ${context.summary || context.title || 'Processed'}`
        };
      }

      default:
        throw new Error(`Unsupported node execution type: '${node.type}'`);
    }
  }

  /**
   * Find next node in workflow DAG considering branch handle selections
   */
  getNextNode(currentNode, workflow, selectedBranchHandle) {
    const edges = workflow.edges || [];
    const nodes = workflow.nodes || [];

    let matchingEdge = null;

    if (currentNode.type === 'condition' && selectedBranchHandle) {
      // Find edge explicitly originating from this condition's chosen branch handle ('true' or 'false')
      matchingEdge = edges.find(e => 
        e.source === currentNode.id && 
        (e.sourceHandle === selectedBranchHandle || (selectedBranchHandle === 'true' && e.sourceHandle === 'out'))
      );
    } else {
      // Find default outgoing edge
      matchingEdge = edges.find(e => e.source === currentNode.id);
    }

    if (!matchingEdge) {
      return null; // End of execution branch
    }

    return nodes.find(n => n.id === matchingEdge.target) || null;
  }
}

module.exports = new WorkflowExecutionService();
