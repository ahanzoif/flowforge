/**
 * FlowForge - Workflow Controller
 * Handles HTTP requests for workflow definition and graph endpoints
 */

const workflowService = require('../services/workflow.service');

exports.listWorkflows = (req, res) => {
  try {
    const list = workflowService.getAllWorkflows();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflows',
      details: err.message
    });
  }
};

exports.getWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const wf = workflowService.getWorkflowById(id);
    if (!wf) {
      return res.status(404).json({
        success: false,
        error: `Workflow with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: wf
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflow',
      details: err.message
    });
  }
};

exports.createWorkflow = (req, res) => {
  try {
    const { name, description, status, nodes, edges } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Workflow name is required'
      });
    }

    const created = workflowService.createWorkflow({
      name: name.trim(),
      description: description || '',
      status: status || 'draft',
      nodes: nodes || [],
      edges: edges || []
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: created
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
      details: err.message
    });
  }
};

exports.updateWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const updated = workflowService.updateWorkflow(id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Workflow with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workflow updated successfully',
      data: updated
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow',
      details: err.message
    });
  }
};

exports.deleteWorkflow = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = workflowService.deleteWorkflow(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Workflow with ID '${id}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: `Workflow '${id}' deleted successfully`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow',
      details: err.message
    });
  }
};

exports.resetDemo = (req, res) => {
  try {
    const demo = workflowService.resetDemoWorkflow();
    res.status(200).json({
      success: true,
      message: 'Default demonstration workflow restored',
      data: demo
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset demo workflow',
      details: err.message
    });
  }
};

const executionService = require('../services/execution.service');

exports.runWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const wf = workflowService.getWorkflowById(id);

    if (!wf) {
      return res.status(404).json({
        success: false,
        error: `Workflow with ID '${id}' not found`
      });
    }

    const runResult = await executionService.executeWorkflow(wf);

    if (!runResult.success) {
      return res.status(400).json({
        success: false,
        error: runResult.error,
        data: runResult
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workflow executed successfully',
      data: runResult
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Internal execution failure',
      details: err.message
    });
  }
};
