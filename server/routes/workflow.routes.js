/**
 * FlowForge - Workflow Routes
 * REST Endpoints for workflow management
 */

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

// Reset to initial demonstration workflow
router.post('/reset-demo', workflowController.resetDemo);

// Standard REST CRUD endpoints
router.get('/', workflowController.listWorkflows);
router.get('/:id', workflowController.getWorkflow);
router.post('/', workflowController.createWorkflow);
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

module.exports = router;
