/**
 * FlowForge - Visual Workflow Automation Platform
 * Frontend Interactive Workflow Engine & Canvas Controller (Milestone 2)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // Core State
  // ==========================================================================
  const state = {
    currentWorkflow: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    isDraggingNode: false,
    draggedNodeId: null,
    dragStartMouse: { x: 0, y: 0 },
    dragStartNodePos: { x: 0, y: 0 },
    connecting: null, // { sourceNodeId, sourceHandle, startX, startY }
    zoomLevel: 1.0,
    panOffset: { x: 0, y: 0 },
    allWorkflows: [],
    isExecuting: false
  };

  // Node Templates for palette & creation
  const NODE_TEMPLATES = {
    github_issue: {
      type: 'github_issue',
      category: 'trigger',
      label: 'GitHub Issue Created',
      icon: '⚡',
      defaultConfig: {
        repository: 'owner/repo',
        event: 'issues.opened',
        branch: 'main'
      }
    },
    ai_classifier: {
      type: 'ai_classifier',
      category: 'ai',
      label: 'AI Issue Classifier',
      icon: '🧠',
      defaultConfig: {
        model: 'gpt-4o-mini',
        task: 'classify_issue',
        outputFields: ['type', 'priority', 'summary', 'reason']
      }
    },
    condition: {
      type: 'condition',
      category: 'condition',
      label: 'Branch Condition',
      icon: '🔀',
      defaultConfig: {
        field: 'type',
        operator: 'equals',
        value: 'bug'
      }
    },
    discord: {
      type: 'discord',
      category: 'action',
      label: 'Discord Webhook Alert',
      icon: '💬',
      defaultConfig: {
        channel: 'dev-alerts',
        mentionOnHighPriority: true,
        webhookUrlEnv: 'DISCORD_WEBHOOK_URL'
      }
    },
    email: {
      type: 'email',
      category: 'action',
      label: 'Email Dispatch',
      icon: '✉️',
      defaultConfig: {
        recipient: 'team@company.com',
        subject: '[FlowForge] Issue Alert: {{issue.title}}'
      }
    }
  };

  // ==========================================================================
  // DOM References
  // ==========================================================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const appViews = document.querySelectorAll('.app-view');
  const navBackendPill = document.getElementById('navBackendPill');

  // Builder Elements
  const canvasContainer = document.getElementById('canvasContainer');
  const canvasViewport = document.getElementById('canvasViewport');
  const canvasSvg = document.getElementById('canvasSvg');
  const edgesGroup = document.getElementById('edgesGroup');
  const tempConnectionLine = document.getElementById('tempConnectionLine');
  const nodesContainer = document.getElementById('nodesContainer');
  const inspectorContent = document.getElementById('inspectorContent');
  const btnCloseInspector = document.getElementById('btnCloseInspector');

  // Builder Toolbar
  const workflowNameInput = document.getElementById('workflowNameInput');
  const workflowStatusBadge = document.getElementById('workflowStatusBadge');
  const btnAddNodeDropdown = document.getElementById('btnAddNodeDropdown');
  const addNodeMenu = document.getElementById('addNodeMenu');
  const btnResetDemo = document.getElementById('btnResetDemo');
  const btnViewJson = document.getElementById('btnViewJson');
  const btnSaveWorkflow = document.getElementById('btnSaveWorkflow');
  const btnRunWorkflow = document.getElementById('btnRunWorkflow');

  // Execution Console Elements (Milestone 3)
  const executionPanel = document.getElementById('executionPanel');
  const executionPanelHeader = document.getElementById('executionPanelHeader');
  const execStatusDot = document.getElementById('execStatusDot');
  const execBadge = document.getElementById('execBadge');
  const execMeta = document.getElementById('execMeta');
  const btnToggleExecPanel = document.getElementById('btnToggleExecPanel');
  const btnCloseExecPanel = document.getElementById('btnCloseExecPanel');
  const execEmpty = document.getElementById('execEmpty');
  const execLogStream = document.getElementById('execLogStream');

  // Canvas Zoom Controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnCenterView = document.getElementById('btnCenterView');

  // JSON Modal Elements
  const jsonModal = document.getElementById('jsonModal');
  const jsonCodeViewer = document.getElementById('jsonCodeViewer');
  const btnCloseJsonModal = document.getElementById('btnCloseJsonModal');
  const btnDoneJsonModal = document.getElementById('btnDoneJsonModal');
  const btnCopyWorkflowJson = document.getElementById('btnCopyWorkflowJson');
  const btnDownloadWorkflowJson = document.getElementById('btnDownloadWorkflowJson');

  // Dashboard Elements
  const workflowsGrid = document.getElementById('workflowsGrid');
  const btnNewWorkflow = document.getElementById('btnNewWorkflow');
  const dashTotalWf = document.getElementById('dashTotalWf');
  const dashActiveWf = document.getElementById('dashActiveWf');
  const dashTotalNodes = document.getElementById('dashTotalNodes');

  // Health Monitor Elements
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const metricStatus = document.getElementById('metricStatus');
  const metricProject = document.getElementById('metricProject');
  const metricLatency = document.getElementById('metricLatency');
  const metricLastChecked = document.getElementById('metricLastChecked');
  const responseBody = document.getElementById('responseBody');
  const btnCheckHealth = document.getElementById('btnCheckHealth');
  const autoRefreshToggle = document.getElementById('autoRefreshToggle');
  const btnCopyJson = document.getElementById('btnCopyJson');
  let autoRefreshTimer = null;

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // ==========================================================================
  // Navigation & Tab Switching
  // ==========================================================================
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      
      navTabs.forEach(t => t.classList.remove('active'));
      appViews.forEach(v => v.classList.remove('active'));

      tab.classList.add('active');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');

      if (targetId === 'view-dashboard') {
        loadDashboardWorkflows();
      } else if (targetId === 'view-builder') {
        // Redraw edges when returning to canvas
        requestAnimationFrame(() => renderEdges());
      }
    });
  });

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // ==========================================================================
  // Backend API Communication
  // ==========================================================================
  async function apiFetch(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        ...options
      });
      return await res.json();
    } catch (err) {
      console.error('[FlowForge API Error]:', err);
      throw err;
    }
  }

  async function checkBackendHealth() {
    try {
      const data = await apiFetch('/api/health');
      if (data && data.status === 'ok') {
        navBackendPill.innerHTML = `
          <span class="status-dot online"></span>
          <span class="status-text">Backend: Online</span>
        `;
      }
    } catch {
      navBackendPill.innerHTML = `
        <span class="status-dot offline"></span>
        <span class="status-text">Backend: Offline</span>
      `;
    }
  }

  // Load initial workflow
  async function loadInitialWorkflow() {
    try {
      const res = await apiFetch('/api/workflows');
      if (res && res.success && res.data && res.data.length > 0) {
        state.allWorkflows = res.data;
        // Load the first workflow (demo)
        const firstWf = res.data[0];
        const detail = await apiFetch(`/api/workflows/${firstWf.id}`);
        if (detail && detail.data) {
          setWorkflow(detail.data);
          return;
        }
      }
      // Fallback reset demo
      await resetDemoWorkflow();
    } catch (err) {
      console.error('Failed to load initial workflow:', err);
      showToast('Could not connect to backend. Using local demo fallback.', 'error');
    }
  }

  async function saveWorkflowToBackend() {
    if (!state.currentWorkflow) return;

    btnSaveWorkflow.disabled = true;
    const originalText = btnSaveWorkflow.innerHTML;
    btnSaveWorkflow.innerHTML = `<span>Saving...</span>`;

    try {
      // Sync workflow name and badge
      state.currentWorkflow.name = workflowNameInput.value.trim() || 'Untitled Workflow';
      state.currentWorkflow.updatedAt = new Date().toISOString();

      const res = await apiFetch(`/api/workflows/${state.currentWorkflow.id}`, {
        method: 'PUT',
        body: JSON.stringify(state.currentWorkflow)
      });

      if (res && res.success) {
        showToast('Workflow saved successfully!', 'success');
        const idx = state.allWorkflows.findIndex(w => w.id === state.currentWorkflow.id);
        const entry = {
          id: state.currentWorkflow.id,
          name: state.currentWorkflow.name,
          description: state.currentWorkflow.description,
          status: state.currentWorkflow.status,
          nodeCount: state.currentWorkflow.nodes.length,
          edgeCount: state.currentWorkflow.edges.length,
          updatedAt: state.currentWorkflow.updatedAt
        };
        if (idx !== -1) {
          state.allWorkflows[idx] = entry;
        } else {
          state.allWorkflows.push(entry);
        }
        updateDashboardMetrics();
      } else {
        throw new Error(res.error || 'Failed to save');
      }
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      btnSaveWorkflow.disabled = false;
      btnSaveWorkflow.innerHTML = originalText;
    }
  }

  async function resetDemoWorkflow() {
    try {
      const res = await apiFetch('/api/workflows/reset-demo', { method: 'POST' });
      if (res && res.success && res.data) {
        setWorkflow(res.data);
        showToast('Restored standard demonstration workflow.', 'success');
      }
    } catch (err) {
      showToast('Failed to reset demo: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Workflow Model & Canvas State
  // ==========================================================================
  function setWorkflow(wf) {
    state.currentWorkflow = wf;
    state.selectedNodeId = null;
    state.selectedEdgeId = null;

    workflowNameInput.value = wf.name || 'Untitled Workflow';
    updateStatusBadge(wf.status || 'active');

    clearExecutionHighlighting();
    renderAllNodes();
    renderEdges();
    renderInspector();
    centerCanvas();
  }

  function updateStatusBadge(status) {
    workflowStatusBadge.className = `workflow-badge ${status}`;
    workflowStatusBadge.textContent = status.toUpperCase();
    if (state.currentWorkflow) {
      state.currentWorkflow.status = status;
    }
  }

  // Toggle status between active and draft
  workflowStatusBadge.addEventListener('click', () => {
    const nextStatus = state.currentWorkflow.status === 'active' ? 'draft' : 'active';
    updateStatusBadge(nextStatus);
    showToast(`Workflow status set to ${nextStatus}`, 'info');
  });

  workflowNameInput.addEventListener('change', (e) => {
    if (state.currentWorkflow) {
      state.currentWorkflow.name = e.target.value.trim();
    }
  });

  // ==========================================================================
  // Canvas Node Rendering
  // ==========================================================================
  function renderAllNodes() {
    nodesContainer.innerHTML = '';
    if (!state.currentWorkflow || !state.currentWorkflow.nodes) return;

    state.currentWorkflow.nodes.forEach(node => {
      renderNodeElement(node);
    });
  }

  function getNodeBodyHtml(node) {
    let bodyChipsHtml = '';
    if (node.type === 'github_issue') {
      bodyChipsHtml = `
        <div class="node-prop-chip">
          <span class="node-prop-key">repo:</span>
          <span class="node-prop-val">${escapeHtml(node.config.repository || 'any')}</span>
        </div>
        <div class="node-prop-chip">
          <span class="node-prop-key">event:</span>
          <span class="node-prop-val">${escapeHtml(node.config.event || 'issues.opened')}</span>
        </div>
      `;
    } else if (node.type === 'ai_classifier') {
      bodyChipsHtml = `
        <div class="node-prop-chip">
          <span class="node-prop-key">model:</span>
          <span class="node-prop-val">${escapeHtml(node.config.model || 'gpt-4o-mini')}</span>
        </div>
        <div class="node-prop-chip">
          <span class="node-prop-key">task:</span>
          <span class="node-prop-val">${escapeHtml(node.config.task || 'classify')}</span>
        </div>
      `;
    } else if (node.type === 'condition') {
      bodyChipsHtml = `
        <div class="node-prop-chip">
          <span class="node-prop-key">check:</span>
          <span class="node-prop-val">${escapeHtml(node.config.field || 'type')} == ${escapeHtml(node.config.value || 'bug')}</span>
        </div>
      `;
    } else if (node.type === 'discord') {
      bodyChipsHtml = `
        <div class="node-prop-chip">
          <span class="node-prop-key">channel:</span>
          <span class="node-prop-val">#${escapeHtml(node.config.channel || 'alerts')}</span>
        </div>
      `;
    } else if (node.type === 'email') {
      bodyChipsHtml = `
        <div class="node-prop-chip">
          <span class="node-prop-key">to:</span>
          <span class="node-prop-val">${escapeHtml(node.config.recipient || 'admin@domain.com')}</span>
        </div>
      `;
    }
    return bodyChipsHtml;
  }

  function renderNodeElement(node) {
    const template = NODE_TEMPLATES[node.type] || {
      category: 'action',
      icon: '📦',
      label: node.label || 'Node'
    };

    const nodeEl = document.createElement('div');
    nodeEl.id = `node-${node.id}`;
    nodeEl.className = `workflow-node node-${template.category}`;
    if (state.selectedNodeId === node.id) {
      nodeEl.classList.add('selected');
    }

    nodeEl.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
    nodeEl.setAttribute('data-id', node.id);

    const bodyChipsHtml = getNodeBodyHtml(node);

    // Ports HTML
    let portsHtml = '';
    // Input handle (all nodes except triggers have input handles)
    if (node.type !== 'github_issue') {
      portsHtml += `<div class="node-port port-input" data-node-id="${node.id}" data-handle-type="in" data-handle-id="in" title="Input Port"></div>`;
    }

    // Output handle(s)
    if (node.type === 'condition') {
      portsHtml += `
        <div class="node-port port-branch-true" data-node-id="${node.id}" data-handle-type="out" data-handle-id="true" title="Branch: BUG (True)"></div>
        <span class="port-label label-true">BUG</span>
        <div class="node-port port-branch-false" data-node-id="${node.id}" data-handle-type="out" data-handle-id="false" title="Branch: OTHER (False)"></div>
        <span class="port-label label-false">OTHER</span>
      `;
    } else {
      portsHtml += `<div class="node-port port-output" data-node-id="${node.id}" data-handle-type="out" data-handle-id="out" title="Output Port"></div>`;
    }

    nodeEl.innerHTML = `
      <div class="node-header">
        <div class="node-header-left">
          <span class="node-icon-badge">${template.icon}</span>
          <span class="node-title">${escapeHtml(node.label || template.label)}</span>
        </div>
        <button class="node-delete-btn" title="Delete node">×</button>
      </div>
      <div class="node-body">
        ${bodyChipsHtml}
      </div>
      ${portsHtml}
    `;

    // Event: Click to select node
    nodeEl.addEventListener('click', (e) => {
      // Don't trigger if clicked port or delete
      if (e.target.classList.contains('node-port') || e.target.classList.contains('node-delete-btn')) {
        return;
      }
      selectNode(node.id);
    });

    // Event: Delete Node
    const btnDel = nodeEl.querySelector('.node-delete-btn');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNode(node.id);
    });

    // Event: Drag Node on canvas
    const headerEl = nodeEl.querySelector('.node-header');
    headerEl.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('node-delete-btn')) return;
      e.preventDefault();
      e.stopPropagation();

      selectNode(node.id);

      state.isDraggingNode = true;
      state.draggedNodeId = node.id;
      state.dragStartMouse = { x: e.clientX, y: e.clientY };
      state.dragStartNodePos = { x: node.position.x, y: node.position.y };

      window.addEventListener('mousemove', onNodeMouseMove);
      window.addEventListener('mouseup', onNodeMouseUp);
    });

    // Event: Port Connection Initiation
    const ports = nodeEl.querySelectorAll('.node-port[data-handle-type="out"]');
    ports.forEach(port => {
      port.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startConnecting(node.id, port.getAttribute('data-handle-id'), e);
      });
    });

    nodesContainer.appendChild(nodeEl);
  }

  function updateNodeSummary(nodeId) {
    const node = state.currentWorkflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (!nodeEl) return;

    const titleEl = nodeEl.querySelector('.node-title');
    if (titleEl) titleEl.textContent = node.label;

    const bodyEl = nodeEl.querySelector('.node-body');
    if (bodyEl) {
      bodyEl.innerHTML = getNodeBodyHtml(node);
    }
  }

  // ==========================================================================
  // Node Dragging Logic
  // ==========================================================================
  function onNodeMouseMove(e) {
    if (!state.isDraggingNode || !state.draggedNodeId) return;

    const dx = (e.clientX - state.dragStartMouse.x) / state.zoomLevel;
    const dy = (e.clientY - state.dragStartMouse.y) / state.zoomLevel;

    const node = state.currentWorkflow.nodes.find(n => n.id === state.draggedNodeId);
    if (!node) return;

    // Grid snap (10px)
    const newX = Math.round((state.dragStartNodePos.x + dx) / 10) * 10;
    const newY = Math.round((state.dragStartNodePos.y + dy) / 10) * 10;

    node.position.x = Math.max(20, newX);
    node.position.y = Math.max(20, newY);

    const nodeEl = document.getElementById(`node-${node.id}`);
    if (nodeEl) {
      nodeEl.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
    }

    renderEdges();
  }

  function onNodeMouseUp() {
    state.isDraggingNode = false;
    state.draggedNodeId = null;
    window.removeEventListener('mousemove', onNodeMouseMove);
    window.removeEventListener('mouseup', onNodeMouseUp);
  }

  // ==========================================================================
  // Node Selection & Deletion
  // ==========================================================================
  function selectNode(nodeId) {
    state.selectedNodeId = nodeId;
    state.selectedEdgeId = null;

    document.querySelectorAll('.workflow-node').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.workflow-edge').forEach(el => el.classList.remove('selected'));

    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) nodeEl.classList.add('selected');

    renderInspector();
  }

  function deselectAll() {
    state.selectedNodeId = null;
    state.selectedEdgeId = null;
    document.querySelectorAll('.workflow-node').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.workflow-edge').forEach(el => el.classList.remove('selected'));
    renderInspector();
  }

  canvasContainer.addEventListener('click', (e) => {
    if (e.target === canvasContainer || e.target === canvasViewport || e.target === canvasSvg) {
      deselectAll();
    }
  });

  function deleteNode(nodeId) {
    if (!state.currentWorkflow) return;

    // Remove node
    state.currentWorkflow.nodes = state.currentWorkflow.nodes.filter(n => n.id !== nodeId);

    // Remove connected edges
    state.currentWorkflow.edges = state.currentWorkflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    if (state.selectedNodeId === nodeId) {
      state.selectedNodeId = null;
    }

    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) nodeEl.remove();

    renderEdges();
    renderInspector();
    showToast('Node removed', 'info');
  }

  // ==========================================================================
  // Edge Connecting (Port-to-Port Wiring)
  // ==========================================================================
  function getHandlePosition(nodeId, handleId, handleType) {
    const node = state.currentWorkflow.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // Try reading exact DOM element port position if rendered
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) {
      let selector = `.node-port[data-node-id="${nodeId}"][data-handle-type="${handleType}"]`;
      if (handleId && handleId !== 'in' && handleId !== 'out') {
        selector += `[data-handle-id="${handleId}"]`;
      }
      const portEl = nodeEl.querySelector(selector) || nodeEl.querySelector(`.node-port[data-handle-id="${handleId}"]`);
      if (portEl) {
        return {
          x: node.position.x + portEl.offsetLeft + (portEl.offsetWidth / 2),
          y: node.position.y + portEl.offsetTop + (portEl.offsetHeight / 2)
        };
      }
    }

    // Mathematical fallback based on standard dimensions
    const nodeWidth = 250;
    let x = node.position.x;
    let y = node.position.y + 55;

    if (handleType === 'in') {
      x = node.position.x;
      y = node.position.y + 55;
    } else if (handleType === 'out') {
      x = node.position.x + nodeWidth;
      if (handleId === 'true') {
        y = node.position.y + 40;
      } else if (handleId === 'false') {
        y = node.position.y + 75;
      } else {
        y = node.position.y + 55;
      }
    }

    return { x, y };
  }

  function startConnecting(sourceNodeId, sourceHandle, e) {
    const startPos = getHandlePosition(sourceNodeId, sourceHandle, 'out');

    state.connecting = {
      sourceNodeId,
      sourceHandle,
      startX: startPos.x,
      startY: startPos.y
    };

    tempConnectionLine.style.display = 'block';
    updateTempLine(startPos.x, startPos.y, startPos.x, startPos.y);

    window.addEventListener('mousemove', onConnectingMouseMove);
    window.addEventListener('mouseup', onConnectingMouseUp);
  }

  function onConnectingMouseMove(e) {
    if (!state.connecting) return;

    const rect = canvasViewport.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / state.zoomLevel;
    const currentY = (e.clientY - rect.top) / state.zoomLevel;

    updateTempLine(state.connecting.startX, state.connecting.startY, currentX, currentY);
  }

  function updateTempLine(x1, y1, x2, y2) {
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
    const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    tempConnectionLine.setAttribute('d', path);
  }

  function onConnectingMouseUp(e) {
    if (!state.connecting) return;

    // Check if mouse released over an input port or dropped anywhere on a target node
    let portEl = document.elementFromPoint(e.clientX, e.clientY);
    if (portEl) {
      if (!portEl.classList.contains('node-port')) {
        const nodeEl = portEl.closest('.workflow-node');
        if (nodeEl) {
          const candidatePort = nodeEl.querySelector('.node-port[data-handle-type="in"]');
          if (candidatePort) {
            portEl = candidatePort;
          }
        }
      }

      if (portEl && portEl.classList.contains('node-port') && portEl.getAttribute('data-handle-type') === 'in') {
        const targetNodeId = portEl.getAttribute('data-node-id');
        const targetHandle = portEl.getAttribute('data-handle-id') || 'in';

        createEdge(state.connecting.sourceNodeId, targetNodeId, state.connecting.sourceHandle, targetHandle);
      }
    }

    // Cleanup
    state.connecting = null;
    tempConnectionLine.style.display = 'none';
    window.removeEventListener('mousemove', onConnectingMouseMove);
    window.removeEventListener('mouseup', onConnectingMouseUp);
  }

  function createEdge(source, target, sourceHandle, targetHandle) {
    if (!state.currentWorkflow) return;

    // Rule: Cannot connect to self
    if (source === target) {
      showToast('Cannot connect a node to itself', 'error');
      return;
    }

    // Rule: Avoid exact duplicate edge
    const exists = state.currentWorkflow.edges.some(
      e => e.source === source && e.target === target && e.sourceHandle === sourceHandle
    );

    if (exists) {
      showToast('Connection already exists', 'info');
      return;
    }

    let edgeLabel = '';
    if (sourceHandle === 'true') edgeLabel = 'True (BUG)';
    if (sourceHandle === 'false') edgeLabel = 'False (OTHER)';

    const newEdge = {
      id: `e-${source}-${target}-${Date.now().toString(36)}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      label: edgeLabel
    };

    state.currentWorkflow.edges.push(newEdge);
    renderEdges();
    showToast('Nodes connected', 'success');
  }

  function deleteEdge(edgeId) {
    if (!state.currentWorkflow) return;
    state.currentWorkflow.edges = state.currentWorkflow.edges.filter(e => e.id !== edgeId);
    if (state.selectedEdgeId === edgeId) {
      state.selectedEdgeId = null;
    }
    renderEdges();
    showToast('Connection removed', 'info');
  }

  // ==========================================================================
  // Edge Rendering (SVG Bezier Paths)
  // ==========================================================================
  function renderEdges() {
    edgesGroup.innerHTML = '';
    if (!state.currentWorkflow || !state.currentWorkflow.edges) return;

    state.currentWorkflow.edges.forEach(edge => {
      const p1 = getHandlePosition(edge.source, edge.sourceHandle, 'out');
      const p2 = getHandlePosition(edge.target, edge.targetHandle, 'in');

      const dx = Math.max(Math.abs(p2.x - p1.x) * 0.5, 45);
      const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('id', `edge-${edge.id}`);

      let edgeClass = 'workflow-edge';
      let marker = 'url(#arrowhead)';

      if (edge.sourceHandle === 'true') {
        edgeClass += ' branch-true';
        marker = 'url(#arrowhead-true)';
      } else if (edge.sourceHandle === 'false') {
        edgeClass += ' branch-false';
        marker = 'url(#arrowhead-false)';
      }

      if (state.selectedEdgeId === edge.id) {
        edgeClass += ' selected';
      }

      pathEl.setAttribute('class', edgeClass);
      pathEl.setAttribute('marker-end', marker);

      // Select Edge on click
      pathEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEdge(edge.id);
      });

      edgesGroup.appendChild(pathEl);

      // Render Edge Label or Delete Button in Midpoint
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      if (state.selectedEdgeId === edge.id) {
        // Render interactive Delete Button at midpoint
        const delGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        delGroup.setAttribute('class', 'edge-delete-btn');
        delGroup.setAttribute('transform', `translate(${midX}, ${midY})`);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '9');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = '×';

        delGroup.appendChild(circle);
        delGroup.appendChild(text);

        delGroup.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteEdge(edge.id);
        });

        edgesGroup.appendChild(delGroup);
      } else if (edge.label) {
        // Render condition branch label pill
        const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelGroup.setAttribute('class', 'edge-label-group');
        labelGroup.setAttribute('transform', `translate(${midX}, ${midY})`);

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('class', 'edge-label-bg');
        bg.setAttribute('x', '-38');
        bg.setAttribute('y', '-9');
        bg.setAttribute('width', '76');
        bg.setAttribute('height', '18');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'edge-label-text');
        text.textContent = edge.label;

        labelGroup.appendChild(bg);
        labelGroup.appendChild(text);

        labelGroup.addEventListener('click', (e) => {
          e.stopPropagation();
          selectEdge(edge.id);
        });

        edgesGroup.appendChild(labelGroup);
      }
    });
  }

  function selectEdge(edgeId) {
    state.selectedEdgeId = edgeId;
    state.selectedNodeId = null;

    document.querySelectorAll('.workflow-node').forEach(el => el.classList.remove('selected'));
    renderEdges();
    renderInspector();
  }

  // Keyboard shortcut to delete selected node or edge
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't trigger if user is typing inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (state.selectedEdgeId) {
        deleteEdge(state.selectedEdgeId);
      } else if (state.selectedNodeId) {
        deleteNode(state.selectedNodeId);
      }
    }
  });

  // ==========================================================================
  // Properties Inspector Panel
  // ==========================================================================
  function renderInspector() {
    if (state.selectedNodeId) {
      const node = state.currentWorkflow.nodes.find(n => n.id === state.selectedNodeId);
      if (!node) {
        renderEmptyInspector();
        return;
      }
      renderNodeInspector(node);
    } else if (state.selectedEdgeId) {
      const edge = state.currentWorkflow.edges.find(e => e.id === state.selectedEdgeId);
      renderEdgeInspector(edge);
    } else {
      renderWorkflowOverviewInspector();
    }
  }

  function renderEmptyInspector() {
    inspectorContent.innerHTML = `
      <div class="empty-inspector">
        <div class="empty-icon">👈</div>
        <h4>No Node Selected</h4>
        <p>Click any node on the canvas to configure parameters, models, conditions, and targets.</p>
      </div>
    `;
  }

  function renderWorkflowOverviewInspector() {
    const wf = state.currentWorkflow;
    if (!wf) return;

    inspectorContent.innerHTML = `
      <div class="form-group">
        <label class="form-label">Workflow Name</label>
        <input type="text" class="form-input" id="inspWfName" value="${escapeHtml(wf.name || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="inspWfDesc" placeholder="Describe workflow purpose...">${escapeHtml(wf.description || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Execution Status</label>
        <select class="form-select" id="inspWfStatus">
          <option value="active" ${wf.status === 'active' ? 'selected' : ''}>Active (Automating)</option>
          <option value="draft" ${wf.status === 'draft' ? 'selected' : ''}>Draft (Paused)</option>
        </select>
      </div>

      <div class="node-prop-chip" style="margin-top: 0.5rem;">
        <span class="node-prop-key">Total Nodes:</span>
        <span class="node-prop-val">${wf.nodes.length}</span>
      </div>
      <div class="node-prop-chip">
        <span class="node-prop-key">Total Directed Edges:</span>
        <span class="node-prop-val">${wf.edges.length}</span>
      </div>

      <div class="inspector-actions">
        <button class="btn btn-outline" id="inspBtnViewJson">View JSON Model</button>
      </div>
    `;

    document.getElementById('inspWfName').addEventListener('input', (e) => {
      wf.name = e.target.value;
      workflowNameInput.value = e.target.value;
    });

    document.getElementById('inspWfDesc').addEventListener('input', (e) => {
      wf.description = e.target.value;
    });

    document.getElementById('inspWfStatus').addEventListener('change', (e) => {
      updateStatusBadge(e.target.value);
    });

    document.getElementById('inspBtnViewJson').addEventListener('click', openJsonModal);
  }

  function renderEdgeInspector(edge) {
    if (!edge) return renderEmptyInspector();

    inspectorContent.innerHTML = `
      <h4>Directed Connection</h4>
      <div class="node-prop-chip">
        <span class="node-prop-key">Source Node:</span>
        <span class="node-prop-val">${escapeHtml(edge.source)} (${edge.sourceHandle})</span>
      </div>
      <div class="node-prop-chip">
        <span class="node-prop-key">Target Node:</span>
        <span class="node-prop-val">${escapeHtml(edge.target)}</span>
      </div>
      <div class="form-group" style="margin-top: 0.75rem;">
        <label class="form-label">Connection Label</label>
        <input type="text" class="form-input" id="inspEdgeLabel" value="${escapeHtml(edge.label || '')}">
      </div>
      <div class="inspector-actions">
        <button class="btn btn-danger" id="inspBtnDeleteEdge">Delete Connection</button>
      </div>
    `;

    document.getElementById('inspEdgeLabel').addEventListener('input', (e) => {
      edge.label = e.target.value;
      renderEdges();
    });

    document.getElementById('inspBtnDeleteEdge').addEventListener('click', () => {
      deleteEdge(edge.id);
    });
  }

  function renderNodeInspector(node) {
    let customFieldsHtml = '';

    if (node.type === 'github_issue') {
      customFieldsHtml = `
        <div class="form-group">
          <label class="form-label">Repository (Owner/Repo)</label>
          <input type="text" class="form-input" id="cfgGithubRepo" value="${escapeHtml(node.config.repository || '')}">
          <span class="form-hint">Example: facebook/react, vercel/next.js</span>
        </div>
        <div class="form-group">
          <label class="form-label">Webhook Event Filter</label>
          <select class="form-select" id="cfgGithubEvent">
            <option value="issues.opened" ${node.config.event === 'issues.opened' ? 'selected' : ''}>issues.opened</option>
            <option value="issues.reopened" ${node.config.event === 'issues.reopened' ? 'selected' : ''}>issues.reopened</option>
            <option value="issues.labeled" ${node.config.event === 'issues.labeled' ? 'selected' : ''}>issues.labeled</option>
          </select>
        </div>
      `;
    } else if (node.type === 'ai_classifier') {
      customFieldsHtml = `
        <div class="form-group">
          <label class="form-label">LLM Engine</label>
          <select class="form-select" id="cfgAiModel">
            <option value="gpt-4o-mini" ${node.config.model === 'gpt-4o-mini' ? 'selected' : ''}>OpenAI gpt-4o-mini (Default)</option>
            <option value="gpt-4o" ${node.config.model === 'gpt-4o' ? 'selected' : ''}>OpenAI gpt-4o (High Reasoning)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Classification Task</label>
          <input type="text" class="form-input" id="cfgAiTask" value="${escapeHtml(node.config.task || 'classify_issue')}">
          <span class="form-hint">Returns structured JSON: type, priority, summary</span>
        </div>
      `;
    } else if (node.type === 'condition') {
      customFieldsHtml = `
        <div class="form-group">
          <label class="form-label">Evaluation Field</label>
          <input type="text" class="form-input" id="cfgCondField" value="${escapeHtml(node.config.field || 'type')}">
        </div>
        <div class="form-group">
          <label class="form-label">Comparison Operator</label>
          <select class="form-select" id="cfgCondOperator">
            <option value="equals" ${node.config.operator === 'equals' ? 'selected' : ''}>equals (==)</option>
            <option value="not_equals" ${node.config.operator === 'not_equals' ? 'selected' : ''}>not equals (!=)</option>
            <option value="contains" ${node.config.operator === 'contains' ? 'selected' : ''}>contains</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target Match Value</label>
          <input type="text" class="form-input" id="cfgCondValue" value="${escapeHtml(node.config.value || 'bug')}">
          <span class="form-hint">Routes to True port on match, False port otherwise</span>
        </div>
      `;
    } else if (node.type === 'discord') {
      customFieldsHtml = `
        <div class="form-group">
          <label class="form-label">Discord Channel Name</label>
          <input type="text" class="form-input" id="cfgDiscordChannel" value="${escapeHtml(node.config.channel || 'dev-alerts')}">
        </div>
        <div class="form-group">
          <label class="form-label">Webhook Env Key</label>
          <input type="text" class="form-input" id="cfgDiscordEnv" value="${escapeHtml(node.config.webhookUrlEnv || 'DISCORD_WEBHOOK_URL')}">
        </div>
        <div class="form-group">
          <label class="toggle-label" style="font-size: 0.78rem;">
            <input type="checkbox" id="cfgDiscordMention" ${node.config.mentionOnHighPriority ? 'checked' : ''}>
            <span>Mention @here on HIGH priority</span>
          </label>
        </div>
      `;
    } else if (node.type === 'email') {
      customFieldsHtml = `
        <div class="form-group">
          <label class="form-label">Recipient Email</label>
          <input type="email" class="form-input" id="cfgEmailTo" value="${escapeHtml(node.config.recipient || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Subject Template</label>
          <input type="text" class="form-input" id="cfgEmailSubject" value="${escapeHtml(node.config.subject || '')}">
        </div>
      `;
    }

    inspectorContent.innerHTML = `
      <div class="form-group">
        <label class="form-label">Node Title</label>
        <input type="text" class="form-input" id="inspNodeTitle" value="${escapeHtml(node.label || '')}">
      </div>

      <div class="node-prop-chip">
        <span class="node-prop-key">ID:</span>
        <span class="node-prop-val">${escapeHtml(node.id)}</span>
      </div>
      <div class="node-prop-chip">
        <span class="node-prop-key">Type:</span>
        <span class="node-prop-val">${escapeHtml(node.type)}</span>
      </div>

      ${customFieldsHtml}

      <div class="inspector-actions">
        <button class="btn btn-danger" id="inspBtnDeleteNode">Delete Node</button>
      </div>
    `;

    // Bind common node fields
    document.getElementById('inspNodeTitle').addEventListener('input', (e) => {
      node.label = e.target.value.trim();
      updateNodeSummary(node.id);
    });

    document.getElementById('inspBtnDeleteNode').addEventListener('click', () => {
      deleteNode(node.id);
    });

    // Bind type-specific config fields
    if (node.type === 'github_issue') {
      document.getElementById('cfgGithubRepo').addEventListener('input', (e) => {
        node.config.repository = e.target.value.trim();
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgGithubEvent').addEventListener('change', (e) => {
        node.config.event = e.target.value;
        updateNodeSummary(node.id);
      });
    } else if (node.type === 'ai_classifier') {
      document.getElementById('cfgAiModel').addEventListener('change', (e) => {
        node.config.model = e.target.value;
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgAiTask').addEventListener('input', (e) => {
        node.config.task = e.target.value.trim();
        updateNodeSummary(node.id);
      });
    } else if (node.type === 'condition') {
      document.getElementById('cfgCondField').addEventListener('input', (e) => {
        node.config.field = e.target.value.trim();
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgCondOperator').addEventListener('change', (e) => {
        node.config.operator = e.target.value;
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgCondValue').addEventListener('input', (e) => {
        node.config.value = e.target.value.trim();
        updateNodeSummary(node.id);
      });
    } else if (node.type === 'discord') {
      document.getElementById('cfgDiscordChannel').addEventListener('input', (e) => {
        node.config.channel = e.target.value.trim();
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgDiscordEnv').addEventListener('input', (e) => {
        node.config.webhookUrlEnv = e.target.value.trim();
      });
      document.getElementById('cfgDiscordMention').addEventListener('change', (e) => {
        node.config.mentionOnHighPriority = e.target.checked;
      });
    } else if (node.type === 'email') {
      document.getElementById('cfgEmailTo').addEventListener('input', (e) => {
        node.config.recipient = e.target.value.trim();
        updateNodeSummary(node.id);
      });
      document.getElementById('cfgEmailSubject').addEventListener('input', (e) => {
        node.config.subject = e.target.value.trim();
      });
    }
  }

  btnCloseInspector.addEventListener('click', () => {
    deselectAll();
  });

  // ==========================================================================
  // Add Node from Palette or Dropdown
  // ==========================================================================
  function createNewNode(type) {
    if (!state.currentWorkflow) return;

    const template = NODE_TEMPLATES[type];
    if (!template) return;

    const count = state.currentWorkflow.nodes.filter(n => n.type === type).length + 1;
    const nodeId = `${type.replace('_', '-')}-${count}`;

    // Calculate canvas center coordinates
    const rect = canvasContainer.getBoundingClientRect();
    const spawnX = Math.round(((-state.panOffset.x + (rect.width / 2) - 120) / state.zoomLevel) / 10) * 10;
    const spawnY = Math.round(((-state.panOffset.y + (rect.height / 2) - 60) / state.zoomLevel) / 10) * 10;

    const newNode = {
      id: nodeId,
      type: template.type,
      label: template.label,
      position: { x: Math.max(30, spawnX), y: Math.max(30, spawnY) },
      config: JSON.parse(JSON.stringify(template.defaultConfig))
    };

    state.currentWorkflow.nodes.push(newNode);
    renderNodeElement(newNode);
    selectNode(newNode.id);
    renderEdges();
    showToast(`Added ${template.label}`, 'info');
  }

  // Palette clicks
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-node-type');
      createNewNode(type);
    });
  });

  // Dropdown Menu Toggle
  btnAddNodeDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    addNodeMenu.classList.toggle('show');
  });

  document.querySelectorAll('#addNodeMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = item.getAttribute('data-node-type');
      createNewNode(type);
      addNodeMenu.classList.remove('show');
    });
  });

  window.addEventListener('click', () => {
    addNodeMenu.classList.remove('show');
  });

  // ==========================================================================
  // Zoom & Pan Controls
  // ==========================================================================
  function applyTransform() {
    canvasViewport.style.transform = `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${state.zoomLevel})`;
    btnZoomReset.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  }

  btnZoomIn.addEventListener('click', () => {
    if (state.zoomLevel < 1.8) {
      state.zoomLevel = Math.round((state.zoomLevel + 0.15) * 100) / 100;
      applyTransform();
    }
  });

  btnZoomOut.addEventListener('click', () => {
    if (state.zoomLevel > 0.5) {
      state.zoomLevel = Math.round((state.zoomLevel - 0.15) * 100) / 100;
      applyTransform();
    }
  });

  btnZoomReset.addEventListener('click', () => {
    state.zoomLevel = 1.0;
    state.panOffset = { x: 0, y: 0 };
    applyTransform();
  });

  btnCenterView.addEventListener('click', centerCanvas);

  function centerCanvas() {
    if (!state.currentWorkflow || state.currentWorkflow.nodes.length === 0) {
      state.zoomLevel = 1.0;
      state.panOffset = { x: 40, y: 40 };
      applyTransform();
      return;
    }

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.currentWorkflow.nodes.forEach(n => {
      if (n.position.x < minX) minX = n.position.x;
      if (n.position.y < minY) minY = n.position.y;
      if (n.position.x + 250 > maxX) maxX = n.position.x + 250;
      if (n.position.y + 110 > maxY) maxY = n.position.y + 110;
    });

    const rect = canvasContainer.getBoundingClientRect();
    const padding = 60;
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const scaleX = (rect.width - padding * 2) / graphWidth;
    const scaleY = (rect.height - padding * 2) / graphHeight;
    state.zoomLevel = Math.min(1.1, Math.max(0.65, Math.min(scaleX, scaleY)));

    state.panOffset.x = (rect.width - graphWidth * state.zoomLevel) / 2 - minX * state.zoomLevel;
    state.panOffset.y = (rect.height - graphHeight * state.zoomLevel) / 2 - minY * state.zoomLevel;

    applyTransform();
  }

  // ==========================================================================
  // Canvas Background Drag Panning & Wheel Zoom
  // ==========================================================================
  let isPanningCanvas = false;
  let panStart = { x: 0, y: 0 };
  let initialPan = { x: 0, y: 0 };

  canvasContainer.addEventListener('mousedown', (e) => {
    // Only start pan if clicking the canvas background or empty SVG area
    if (e.target === canvasContainer || e.target === canvasViewport || e.target === canvasSvg || e.target.id === 'edgesGroup') {
      isPanningCanvas = true;
      panStart = { x: e.clientX, y: e.clientY };
      initialPan = { x: state.panOffset.x, y: state.panOffset.y };
      canvasContainer.classList.add('panning');

      window.addEventListener('mousemove', onCanvasPanMove);
      window.addEventListener('mouseup', onCanvasPanUp);
    }
  });

  function onCanvasPanMove(e) {
    if (!isPanningCanvas) return;
    state.panOffset.x = initialPan.x + (e.clientX - panStart.x);
    state.panOffset.y = initialPan.y + (e.clientY - panStart.y);
    applyTransform();
  }

  function onCanvasPanUp() {
    isPanningCanvas = false;
    canvasContainer.classList.remove('panning');
    window.removeEventListener('mousemove', onCanvasPanMove);
    window.removeEventListener('mouseup', onCanvasPanUp);
  }

  // Smooth mouse wheel zoom
  canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(1.8, Math.max(0.45, Math.round(state.zoomLevel * zoomFactor * 100) / 100));
    if (newZoom !== state.zoomLevel) {
      state.zoomLevel = newZoom;
      applyTransform();
    }
  }, { passive: false });

  // ==========================================================================
  // JSON Viewer Modal
  // ==========================================================================
  function openJsonModal() {
    if (!state.currentWorkflow) return;
    jsonCodeViewer.textContent = JSON.stringify(state.currentWorkflow, null, 2);
    jsonModal.classList.add('show');
  }

  btnViewJson.addEventListener('click', openJsonModal);
  btnCloseJsonModal.addEventListener('click', () => jsonModal.classList.remove('show'));
  btnDoneJsonModal.addEventListener('click', () => jsonModal.classList.remove('show'));

  btnCopyWorkflowJson.addEventListener('click', () => {
    if (!state.currentWorkflow) return;
    navigator.clipboard.writeText(JSON.stringify(state.currentWorkflow, null, 2)).then(() => {
      const orig = btnCopyWorkflowJson.textContent;
      btnCopyWorkflowJson.textContent = 'Copied!';
      setTimeout(() => btnCopyWorkflowJson.textContent = orig, 1800);
    });
  });

  btnDownloadWorkflowJson.addEventListener('click', () => {
    if (!state.currentWorkflow) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.currentWorkflow, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${state.currentWorkflow.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  });

  // ==========================================================================
  // Toolbar Buttons
  // ==========================================================================
  btnSaveWorkflow.addEventListener('click', saveWorkflowToBackend);
  btnResetDemo.addEventListener('click', resetDemoWorkflow);
  btnRunWorkflow.addEventListener('click', runWorkflowExecution);

  // ==========================================================================
  // Workflow Execution Engine (Milestone 3)
  // ==========================================================================
  async function runWorkflowExecution() {
    if (state.isExecuting) return;
    if (!state.currentWorkflow) {
      showToast('No active workflow to execute', 'error');
      return;
    }

    state.isExecuting = true;
    btnRunWorkflow.disabled = true;
    btnRunWorkflow.classList.add('running');
    btnRunWorkflow.querySelector('.btn-run-text').textContent = 'Running...';

    // Clear previous node and edge highlights
    clearExecutionHighlighting();

    // Show execution panel
    executionPanel.classList.remove('closed', 'collapsed');
    btnToggleExecPanel.textContent = '▾';
    execEmpty.style.display = 'none';
    execLogStream.style.display = 'flex';
    execLogStream.innerHTML = '';

    // Update panel header
    execStatusDot.className = 'exec-status-dot running';
    execBadge.className = 'exec-badge badge-running';
    execBadge.textContent = 'RUNNING';
    execMeta.textContent = `Workflow: ${state.currentWorkflow.name}`;

    try {
      // Auto-save any pending canvas edits first so engine executes up-to-date graph
      try {
        await apiFetch(`/api/workflows/${state.currentWorkflow.id}`, {
          method: 'PUT',
          body: JSON.stringify(state.currentWorkflow)
        });
      } catch (saveErr) {
        console.warn('Pre-execution auto-save warning:', saveErr);
      }

      // POST /api/workflows/:id/run
      const runRes = await apiFetch(`/api/workflows/${state.currentWorkflow.id}/run`, {
        method: 'POST'
      });

      if (!runRes || !runRes.success) {
        throw new Error(runRes?.error || 'Workflow execution failed');
      }

      const execution = runRes.data;
      const steps = execution.steps || [];

      // Step-by-step sequential canvas animation and timeline log stream
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepTime = new Date(step.startedAt || Date.now()).toLocaleTimeString();

        // 1. Highlight current node as executing on canvas
        const nodeEl = document.getElementById(`node-${step.nodeId}`);
        if (nodeEl) {
          nodeEl.classList.remove('execution-success', 'execution-failed', 'execution-skipped');
          nodeEl.classList.add('executing');
        }

        // 2. Generate informative step description
        let desc = '';
        if (step.type === 'github_issue') {
          desc = `Simulated issue #${step.output.issueNumber}: "${escapeHtml(step.output.title)}" (${escapeHtml(step.output.repository)})`;
        } else if (step.type === 'ai_classifier') {
          desc = `Classification: ${step.output.type.toUpperCase()} • Priority: ${step.output.priority.toUpperCase()} • Confidence: ${(step.output.confidence * 100).toFixed(0)}% (${step.output.modelUsed})`;
        } else if (step.type === 'condition') {
          desc = `Condition evaluated: ${step.output.evaluatedField} (${step.output.actualValue}) ${step.output.operator} ${step.output.expectedValue} ➔ Branch: ${step.output.branchSelected === 'true' ? 'BUG (True)' : 'OTHER (False)'}`;
        } else if (step.type === 'discord') {
          desc = `Simulated alert sent to #${step.output.channel} [${step.output.status}]`;
        } else if (step.type === 'email') {
          desc = `Simulated email dispatched to ${step.output.recipient} [${step.output.status}]`;
        }

        // 3. Append step to execution log stream
        const stepEl = document.createElement('div');
        stepEl.className = 'exec-log-row step-success';
        stepEl.innerHTML = `
          <span class="exec-row-time">${stepTime}</span>
          <span class="exec-row-icon success">✓</span>
          <div class="exec-row-content">
            <div class="exec-row-title-line">
              <span class="exec-row-label">${escapeHtml(step.label)}</span>
              <span class="exec-row-pill ${step.type === 'github_issue' ? 'trigger' : step.type === 'ai_classifier' ? 'ai' : step.type === 'condition' ? 'condition' : 'action'}">${step.type.replace('_', ' ')}</span>
              <span class="exec-row-duration">${step.durationMs}ms</span>
            </div>
            <div class="exec-row-desc">${desc}</div>
          </div>
        `;
        execLogStream.appendChild(stepEl);
        execLogStream.scrollTop = execLogStream.scrollHeight;

        // Visual animation pause between steps
        await new Promise(r => setTimeout(r, 450));

        // 4. Mark node as successfully executed
        if (nodeEl) {
          nodeEl.classList.remove('executing');
          nodeEl.classList.add('execution-success');
        }

        // 5. Highlight connecting edge to next step if exists
        if (i < steps.length - 1) {
          const nextStep = steps[i + 1];
          const edge = state.currentWorkflow.edges.find(e => 
            e.source === step.nodeId && e.target === nextStep.nodeId &&
            (!step.branchSelected || e.sourceHandle === step.branchSelected)
          );
          if (edge) {
            const edgeEl = document.getElementById(`edge-${edge.id}`);
            if (edgeEl) edgeEl.classList.add('edge-executed');
          }
        }
      }

      // Mark unvisited nodes in workflow as skipped
      const visitedNodeIds = new Set(steps.map(s => s.nodeId));
      state.currentWorkflow.nodes.forEach(n => {
        if (!visitedNodeIds.has(n.id)) {
          const unvisitedEl = document.getElementById(`node-${n.id}`);
          if (unvisitedEl) unvisitedEl.classList.add('execution-skipped');
        }
      });

      // Panel Header Update
      execStatusDot.className = 'exec-status-dot success';
      execBadge.className = 'exec-badge badge-success';
      execBadge.textContent = 'SUCCESS';
      execMeta.textContent = `Completed ${steps.length} steps in ${execution.duration}ms`;

      // Append summary card
      const summaryCard = document.createElement('div');
      summaryCard.className = 'exec-summary-card';
      summaryCard.innerHTML = `
        <div class="exec-summary-stats">
          <span>Status: <strong style="color: var(--accent-green)">SUCCESS</strong></span>
          <span>•</span>
          <span>Steps Executed: <strong>${steps.length}</strong></span>
          <span>•</span>
          <span>Total Duration: <strong>${execution.duration}ms (${(execution.duration / 1000).toFixed(2)}s)</strong></span>
        </div>
        <button class="btn btn-outline btn-sm" id="btnExportExecJson">View Result JSON</button>
      `;
      execLogStream.appendChild(summaryCard);
      summaryCard.querySelector('#btnExportExecJson').addEventListener('click', () => {
        jsonCodeViewer.textContent = JSON.stringify(execution, null, 2);
        jsonModal.classList.add('show');
      });
      execLogStream.scrollTop = execLogStream.scrollHeight;

      showToast(`Workflow execution completed in ${execution.duration}ms!`, 'success');

    } catch (err) {
      console.error('Execution failure:', err);

      execStatusDot.className = 'exec-status-dot failed';
      execBadge.className = 'exec-badge badge-failed';
      execBadge.textContent = 'FAILED';
      execMeta.textContent = err.message;

      const errorEl = document.createElement('div');
      errorEl.className = 'exec-log-row step-failed';
      errorEl.innerHTML = `
        <span class="exec-row-time">${new Date().toLocaleTimeString()}</span>
        <span class="exec-row-icon failed">✕</span>
        <div class="exec-row-content">
          <div class="exec-row-title-line">
            <span class="exec-row-label" style="color: var(--accent-red)">Execution Terminated</span>
          </div>
          <div class="exec-row-desc" style="color: #fca5a5">${escapeHtml(err.message)}</div>
        </div>
      `;
      execLogStream.appendChild(errorEl);
      execLogStream.scrollTop = execLogStream.scrollHeight;

      showToast(`Execution failed: ${err.message}`, 'error');

    } finally {
      state.isExecuting = false;
      btnRunWorkflow.disabled = false;
      btnRunWorkflow.classList.remove('running');
      btnRunWorkflow.querySelector('.btn-run-text').textContent = 'Run Workflow';
    }
  }

  function clearExecutionHighlighting() {
    document.querySelectorAll('.workflow-node').forEach(el => {
      el.classList.remove('executing', 'execution-success', 'execution-failed', 'execution-skipped');
    });
    document.querySelectorAll('.workflow-edge').forEach(el => {
      el.classList.remove('edge-executed');
    });
  }

  // Execution Panel Collapse/Expand Controls
  executionPanelHeader.addEventListener('click', (e) => {
    if (e.target === btnCloseExecPanel || btnCloseExecPanel.contains(e.target)) return;
    executionPanel.classList.toggle('collapsed');
    btnToggleExecPanel.textContent = executionPanel.classList.contains('collapsed') ? '▴' : '▾';
  });

  btnToggleExecPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    executionPanel.classList.toggle('collapsed');
    btnToggleExecPanel.textContent = executionPanel.classList.contains('collapsed') ? '▴' : '▾';
  });

  btnCloseExecPanel.addEventListener('click', (e) => {
    e.stopPropagation();
    executionPanel.classList.add('closed');
  });

  // ==========================================================================
  // Dashboard Management
  // ==========================================================================
  async function loadDashboardWorkflows() {
    try {
      const res = await apiFetch('/api/workflows');
      if (res && res.success && res.data) {
        state.allWorkflows = res.data;
        renderDashboardList(res.data);
        updateDashboardMetrics();
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }

  function updateDashboardMetrics() {
    if (!state.allWorkflows) return;
    dashTotalWf.textContent = state.allWorkflows.length;
    dashActiveWf.textContent = state.allWorkflows.filter(w => w.status === 'active').length;
    let totalNodes = 0;
    state.allWorkflows.forEach(w => totalNodes += (w.nodeCount || 0));
    dashTotalNodes.textContent = totalNodes;
  }

  function renderDashboardList(list) {
    workflowsGrid.innerHTML = '';
    if (list.length === 0) {
      workflowsGrid.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1; padding: 2rem 0; text-align: center;">No workflows created yet. Click "+ Create Workflow" to start.</p>`;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'workflow-card';
      card.innerHTML = `
        <div class="wf-card-header">
          <h3 class="wf-card-title">${escapeHtml(item.name)}</h3>
          <span class="workflow-badge ${item.status}">${item.status.toUpperCase()}</span>
        </div>
        <p class="wf-card-desc">${escapeHtml(item.description || 'No description provided.')}</p>
        <div class="wf-card-stats">
          <span><strong>${item.nodeCount || 0}</strong> nodes</span>
          <span>•</span>
          <span><strong>${item.edgeCount || 0}</strong> edges</span>
        </div>
        <div class="wf-card-footer">
          <button class="btn btn-outline btn-sm btn-open-wf" data-id="${item.id}">Open in Builder</button>
          <div class="wf-card-actions">
            <button class="btn btn-outline btn-sm btn-clone-wf" data-id="${item.id}" title="Duplicate this workflow">Clone</button>
            <button class="btn btn-danger-ghost btn-sm btn-delete-wf" data-id="${item.id}" title="Delete workflow">Delete</button>
          </div>
        </div>
      `;

      // Open in Builder
      card.querySelector('.btn-open-wf').addEventListener('click', async () => {
        const detail = await apiFetch(`/api/workflows/${item.id}`);
        if (detail && detail.data) {
          setWorkflow(detail.data);
          document.getElementById('tabBuilder').click();
        }
      });

      // Clone / Duplicate
      card.querySelector('.btn-clone-wf').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const detail = await apiFetch(`/api/workflows/${item.id}`);
          if (detail && detail.data) {
            const cloneData = {
              name: `${detail.data.name} (Copy)`,
              description: detail.data.description,
              status: 'draft',
              nodes: detail.data.nodes,
              edges: detail.data.edges
            };
            const created = await apiFetch('/api/workflows', {
              method: 'POST',
              body: JSON.stringify(cloneData)
            });
            if (created && created.success) {
              showToast('Workflow duplicated', 'success');
              loadDashboardWorkflows();
            }
          }
        } catch (err) {
          showToast('Clone failed: ' + err.message, 'error');
        }
      });

      // Delete
      card.querySelector('.btn-delete-wf').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (list.length === 1 && item.id === 'wf-demo-github-triage') {
          if (!confirm('This is the primary demonstration workflow. Are you sure you want to delete it? (You can restore it anytime with "Reset Demo")')) {
            return;
          }
        }

        try {
          const res = await apiFetch(`/api/workflows/${item.id}`, { method: 'DELETE' });
          if (res && res.success) {
            showToast('Workflow deleted', 'info');
            loadDashboardWorkflows();
            // If the deleted workflow was currently open in builder, load another or reset demo
            if (state.currentWorkflow && state.currentWorkflow.id === item.id) {
              resetDemoWorkflow();
            }
          }
        } catch (err) {
          showToast('Delete failed: ' + err.message, 'error');
        }
      });

      workflowsGrid.appendChild(card);
    });
  }

  btnNewWorkflow.addEventListener('click', async () => {
    try {
      const res = await apiFetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Custom Workflow',
          description: 'Custom automation pipeline created via FlowForge visual builder',
          status: 'draft',
          nodes: [
            {
              id: 'trigger-1',
              type: 'github_issue',
              label: 'GitHub Issue Created',
              position: { x: 100, y: 150 },
              config: { repository: 'my-org/my-repo', event: 'issues.opened' }
            }
          ],
          edges: []
        })
      });

      if (res && res.success && res.data) {
        state.allWorkflows.push(res.data);
        setWorkflow(res.data);
        document.getElementById('tabBuilder').click();
        showToast('Created new workflow', 'success');
      }
    } catch (err) {
      showToast('Error creating workflow: ' + err.message, 'error');
    }
  });

  // ==========================================================================
  // Health Monitor (From Milestone 1)
  // ==========================================================================
  async function checkHealth() {
    btnCheckHealth.classList.add('loading');
    updateHealthStatus('checking', 'Pinging API...');

    const startTime = performance.now();

    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      metricStatus.textContent = data.status ? data.status.toUpperCase() : 'OK';
      metricStatus.className = 'metric-value success';
      metricProject.textContent = data.project || 'FlowForge';
      metricLatency.textContent = `${latency} ms`;
      metricLastChecked.textContent = new Date().toLocaleTimeString();

      responseBody.textContent = JSON.stringify(data, null, 2);
      updateHealthStatus('online', 'Connected • 200 OK');
    } catch (error) {
      metricStatus.textContent = 'OFFLINE';
      metricStatus.className = 'metric-value error';
      metricLatency.textContent = 'Timeout';
      metricLastChecked.textContent = new Date().toLocaleTimeString();
      responseBody.textContent = JSON.stringify({ error: error.message }, null, 2);
      updateHealthStatus('offline', 'Backend Offline');
    } finally {
      btnCheckHealth.classList.remove('loading');
    }
  }

  function updateHealthStatus(stateName, message) {
    const dot = statusIndicator.querySelector('.status-dot');
    dot.className = `status-dot ${stateName}`;
    statusText.textContent = message;
  }

  btnCheckHealth.addEventListener('click', checkHealth);

  btnCopyJson.addEventListener('click', () => {
    navigator.clipboard.writeText(responseBody.textContent).then(() => {
      const orig = btnCopyJson.textContent;
      btnCopyJson.textContent = 'Copied!';
      setTimeout(() => btnCopyJson.textContent = orig, 1800);
    });
  });

  autoRefreshToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      autoRefreshTimer = setInterval(checkHealth, 5000);
    } else {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  });

  // Helper utility
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  checkBackendHealth();
  checkHealth();
  loadInitialWorkflow();

});
