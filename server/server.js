/**
 * FlowForge - Visual Workflow Automation Platform
 * Core Express Server Entry Point (Milestone 1)
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount Workflow Routes
const workflowRoutes = require('./routes/workflow.routes');
app.use('/api/workflows', workflowRoutes);

/**
 * Health Check API
 * Endpoint: GET /api/health
 * Purpose: Verifies backend service availability and reports server status
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    project: 'FlowForge'
  });
});

// Fallback route: serve index.html for any unhandled GET requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[FlowForge Server Error]:', err.message);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload received'
    });
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start Express HTTP server
app.listen(PORT, () => {
  console.log(`[FlowForge Server] Running on http://localhost:${PORT}`);
  console.log(`[FlowForge Server] Health endpoint: http://localhost:${PORT}/api/health`);
});
