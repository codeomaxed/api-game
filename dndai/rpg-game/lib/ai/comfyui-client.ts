import fs from 'fs';
import path from 'path';

export interface WorkflowOptions {
  prompt?: string;
  segmentationPrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  numSteps?: number;
  enableSegmentation?: boolean;
}

export interface ComfyUIWorkflow {
  [key: string]: {
    inputs: any;
    class_type: string;
    _meta?: {
      title?: string;
    };
  };
}

// ComfyUI native workflow format (with nodes array)
interface ComfyUINativeWorkflow {
  nodes: Array<{
    id: number;
    type: string;
    inputs?: any[];
    outputs?: any[];
    widgets_values?: any[];
    properties?: any;
    _meta?: {
      title?: string;
    };
  }>;
  links?: any[];
  groups?: any[];
  [key: string]: any;
}

/**
 * Check if workflow is in native ComfyUI format (with nodes array)
 */
function isNativeFormat(workflow: any): workflow is ComfyUINativeWorkflow {
  return workflow && Array.isArray(workflow.nodes);
}

export interface ComfyUIResponse {
  prompt_id: string;
}

export interface ComfyUIHistoryItem {
  prompt: any[];
  outputs: {
    [nodeId: string]: {
      images: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    };
  };
  status: {
    status_str: string;
    completed: number;
    queued: number;
  };
}

/**
 * ComfyUI API Client
 * Handles communication with ComfyUI server for workflow execution
 */
export class ComfyUIClient {
  private serverUrl: string;
  private workflowPath: string;
  private baseWorkflow: ComfyUIWorkflow | null = null;
  private baseNativeWorkflow: ComfyUINativeWorkflow | null = null; // Store native format for group control
  private clientId: string;

  constructor(serverUrl: string = 'http://127.0.0.1:8188', workflowPath?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.clientId = `dndai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Default workflow path if not provided
    if (!workflowPath) {
      // Try environment variable first, but warn if it points to old path
      const envPath = process.env.COMFYUI_WORKFLOW_PATH;
      if (envPath) {
        // Check if it's the old path (Api Workflow) - if so, ignore it and use default
        // The old path contains "Api Workflow" directory or "Comfy API.json" filename
        const hasApiWorkflow = envPath.includes('Api Workflow');
        const hasComfyApiJson = envPath.includes('Comfy API.json');
        const hasComfyuiApiJson = envPath.includes('Comfyui API.json');
        const isOldPath = hasApiWorkflow || (hasComfyApiJson && !hasComfyuiApiJson);
        
        console.log('[ComfyUI] Path detection:', {
          envPath,
          hasApiWorkflow,
          hasComfyApiJson,
          hasComfyuiApiJson,
          isOldPath
        });
        
        if (isOldPath) {
          console.warn('[ComfyUI] ⚠ Environment variable COMFYUI_WORKFLOW_PATH points to old workflow path');
          console.warn('[ComfyUI] ⚠ Old path detected:', envPath);
          console.warn('[ComfyUI] ⚠ Ignoring environment variable and using default path instead');
          console.warn('[ComfyUI] ⚠ Please update COMFYUI_WORKFLOW_PATH to point to the new workflow file');
          workflowPath = null; // Force use of default path
        } else {
          // Check if env path points to the correct new file
          if (envPath.includes('Comfyui API.json') && (envPath.includes('user\\default\\workflows') || envPath.includes('user/default/workflows'))) {
            workflowPath = envPath;
            console.log('[ComfyUI] Using workflow path from environment variable:', workflowPath);
          } else {
            console.warn('[ComfyUI] ⚠ Environment variable path may not be correct, using default path');
            console.warn('[ComfyUI] Env path:', envPath);
            workflowPath = null; // Force use of default path
          }
        }
      }
      
      // If not set or old path detected, use default path relative to workspace root
      if (!workflowPath) {
        // Resolve from workspace root (dndai/rpg-game) up to Api Game, then to Image Generator
        // Updated to use the new workflow with GroupController node
        const workspaceRoot = path.resolve(process.cwd(), '..', '..');
        workflowPath = path.join(
          workspaceRoot,
          'Image Generator',
          'ComfyUI_windows_portable',
          'Api Workflow',
          'Comfyui API.json'
        );
        console.log('[ComfyUI] Using default workflow path (resolved from workspace root)');
        console.log('[ComfyUI] Default path:', workflowPath);
      }
    }
    // Ensure we have an absolute path - resolve relative to current working directory if needed
    if (!path.isAbsolute(workflowPath)) {
      this.workflowPath = path.resolve(process.cwd(), workflowPath);
    } else {
      this.workflowPath = path.resolve(workflowPath); // Resolve to absolute path
    }
    console.log('[ComfyUI] Client initialized with workflow path:', this.workflowPath);
    console.log('[ComfyUI] Process CWD:', process.cwd());
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:120',message:'Constructor: workflow path resolved',data:{workflowPath:this.workflowPath,envVar:process.env.COMFYUI_WORKFLOW_PATH,resolved:path.resolve(workflowPath),cwd:process.cwd(),fileExists:fs.existsSync(this.workflowPath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Verify file exists
    const fileExists = fs.existsSync(this.workflowPath);
    if (!fileExists) {
      console.error('[ComfyUI] ❌ Workflow file does not exist at:', this.workflowPath);
      console.error('[ComfyUI] Please ensure the workflow file exists at this path');
      // Try to find the file in common locations
      const alternativePaths = [
        path.join(process.cwd(), '..', '..', 'Image Generator', 'ComfyUI_windows_portable', 'ComfyUI', 'user', 'default', 'workflows', 'Comfyui API.json'),
        path.join(process.cwd(), '..', '..', 'Image Generator', 'ComfyUI_windows_portable', 'Api Workflow', 'Comfyui API.json'),
        path.join(process.cwd(), '..', '..', 'Image Generator', 'ComfyUI_windows_portable', 'Api Workflow', 'Comfy API.json'),
      ];
      for (const altPath of alternativePaths) {
        const resolvedAlt = path.resolve(altPath);
        if (fs.existsSync(resolvedAlt)) {
          console.warn('[ComfyUI] ⚠ Found workflow file at alternative path:', resolvedAlt);
          console.warn('[ComfyUI] Consider updating the workflow path or setting COMFYUI_WORKFLOW_PATH environment variable');
        }
      }
    } else {
      console.log('[ComfyUI] ✓ Workflow file found and verified');
    }
  }

  /**
   * Clear the workflow cache to force reload from file
   */
  public clearWorkflowCache(): void {
    this.baseWorkflow = null;
    console.log('[ComfyUI] Workflow cache cleared - will reload from file on next request');
  }

  /**
   * Convert ComfyUI native format (nodes array) to API format (key-value by node ID)
   */
  private convertNativeToAPIFormat(nativeWorkflow: ComfyUINativeWorkflow): ComfyUIWorkflow {
    const apiWorkflow: ComfyUIWorkflow = {};
    
    console.log('[ComfyUI] Converting native workflow with', nativeWorkflow.nodes.length, 'nodes');
    
    // Build a map of bypassed groups: groupId -> true if bypassed
    const bypassedGroups = new Set<number>();
    if (nativeWorkflow.groups) {
      for (const group of nativeWorkflow.groups) {
        if (group.flags?.mode === 'bypass' || group.flags?.bypass === true) {
          bypassedGroups.add(group.id);
          console.log(`[ComfyUI] Group ${group.id} (${group.title || 'unnamed'}) is bypassed - nodes in this group will be excluded`);
        }
      }
    }
    
    // Build a map of nodes in bypassed groups: nodeId -> true if in bypassed group
    const nodesInBypassedGroups = new Set<number>();
    console.log(`[ComfyUI] Checking nodes for bypassed groups. Bypassed group IDs: ${Array.from(bypassedGroups).join(', ')}`);
    for (const node of nativeWorkflow.nodes) {
      const nodeGroupId = node.group;
      const nodeId = node.id;
      console.log(`[ComfyUI] Node ${nodeId}: group=${nodeGroupId}, type=${node.type || 'unknown'}`);
      
      if (nodeGroupId !== null && nodeGroupId !== undefined && bypassedGroups.has(nodeGroupId)) {
        nodesInBypassedGroups.add(nodeId);
        console.log(`[ComfyUI] ✓ Node ${nodeId} is in bypassed group ${nodeGroupId} - will be excluded`);
      }
    }
    console.log(`[ComfyUI] Nodes in bypassed groups (will be excluded): ${Array.from(nodesInBypassedGroups).sort((a, b) => a - b).join(', ')}`);
    
    // Build a map of links for quick lookup: linkId -> [sourceNodeId, sourceOutputIndex, targetNodeId, targetInputIndex]
    const linkMap = new Map<number, [number, number, number, number]>();
    if (Array.isArray(nativeWorkflow.links)) {
      for (const link of nativeWorkflow.links) {
        // Link format: [linkId, sourceNodeId, sourceOutputIndex, targetNodeId, targetInputIndex, type]
        if (Array.isArray(link) && link.length >= 5) {
          linkMap.set(link[0], [link[1], link[2], link[3], link[4]]);
        }
      }
    }
    
    // Process ALL nodes, but exclude nodes in bypassed groups
    for (const node of nativeWorkflow.nodes) {
      const nodeId = String(node.id);
      
      // Skip nodes in bypassed groups
      const nodeGroupId = node.group;
      if (nodeGroupId !== null && nodeGroupId !== undefined && bypassedGroups.has(nodeGroupId)) {
        console.log(`[ComfyUI] Skipping node ${nodeId} (in bypassed group ${nodeGroupId})`);
        continue;
      }
      
      // Also skip nodes that are in the bypassed groups set (double-check)
      if (nodesInBypassedGroups.has(node.id)) {
        console.log(`[ComfyUI] Skipping node ${nodeId} (found in bypassed groups set)`);
        continue;
      }
      
      
      // Convert inputs array to inputs object
      // In native format, inputs are an array of input definitions
      // In API format, inputs is an object with input names as keys
      const inputs: any = {};
      
      // Process inputs array - each input has name, type, and may have link or widget
      if (Array.isArray(node.inputs) && node.inputs.length > 0) {
        let widgetValueIndex = 0; // Track position in widgets_values array
        
        for (const input of node.inputs) {
          if (input.name) {
            // If input has a link, it's a connection: [nodeId, outputIndex]
            if (input.link !== null && input.link !== undefined) {
              const linkInfo = linkMap.get(input.link);
              if (linkInfo) {
                const sourceNodeId = linkInfo[0];
                // Check if source node is in a bypassed group
                if (nodesInBypassedGroups.has(sourceNodeId)) {
                  // Reconnect to node 46 (VAEDecode - base image output) instead
                  // Node 46 should be outside the Segmentation group and outputs the final image
                  console.log(`[ComfyUI] Reconnecting node ${nodeId} input "${input.name}" from node ${sourceNodeId} to node 46 (VAEDecode - source node is in bypassed group)`);
                  inputs[input.name] = [46, linkInfo[1] || 0]; // Keep the same output index or default to 0
                } else {
                  // Link format: [sourceNodeId, sourceOutputIndex]
                  inputs[input.name] = [linkInfo[0], linkInfo[1]];
                }
              }
            } else if (input.widget) {
              // Input has a widget - get value from widgets_values array
              // widgets_values array is indexed by the order of widget inputs
              if (node.widgets_values && widgetValueIndex < node.widgets_values.length) {
                inputs[input.name] = node.widgets_values[widgetValueIndex];
                widgetValueIndex++;
              }
            }
          }
        }
      }
      // Note: Nodes with empty inputs array will have empty inputs object, which is correct
      
      // Store node data - ALWAYS include the node, even if it has no inputs
      const nodeData: any = {
        inputs,
        class_type: node.type,
      };
      
      // Include _meta if available
      if (node._meta || (node.properties?.title)) {
        nodeData._meta = node._meta || { title: node.properties.title };
      }
      
      // For Fast Groups Bypasser and similar nodes, ALWAYS include properties
      // This is critical for frontend_only nodes like Fast Groups Bypasser
      if (node.properties && Object.keys(node.properties).length > 0) {
        // Include properties directly - ComfyUI API needs this for custom nodes
        nodeData.properties = JSON.parse(JSON.stringify(node.properties)); // Deep clone
      }
      
      apiWorkflow[nodeId] = nodeData;
      
    }
    
    console.log(`[ComfyUI] Conversion complete. Skipped ${skippedCount} nodes, included ${includedCount} nodes.`);
    console.log('[ComfyUI] Converted nodes:', Object.keys(apiWorkflow).sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
    
    return apiWorkflow;
  }

  /**
   * Load the base workflow JSON file
   */
  private loadWorkflow(): ComfyUIWorkflow {
    // Cache workflow to avoid reloading from file every time (performance optimization)
    // Only reload if baseWorkflow is null or if we need fresh data
    if (this.baseWorkflow) {
      // Return cached workflow for better performance
      return JSON.parse(JSON.stringify(this.baseWorkflow)); // Deep clone
    }
    
    // Load from file only on first call or when cache is cleared
    try {
      console.log('[ComfyUI] Loading workflow from:', this.workflowPath);
      const workflowContent = fs.readFileSync(this.workflowPath, 'utf-8');
      const workflow = JSON.parse(workflowContent);
      
      const typeCheck = {
        hasNodes: Array.isArray(workflow.nodes),
        hasKeys: typeof workflow === 'object' && !Array.isArray(workflow) && Object.keys(workflow).length > 0,
        isNativeFormat: isNativeFormat(workflow),
      };
      console.log('[ComfyUI] Workflow loaded. Type check:', typeCheck);
      
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:252',message:'Workflow loaded: format check',data:{...typeCheck,hasGroups:!!workflow.groups,groupsCount:workflow.groups?.length||0,nodeIds:workflow.nodes?.map((n:any)=>n.id)||Object.keys(workflow)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      
      // Check if workflow is in native format and convert if needed
      if (isNativeFormat(workflow)) {
        console.log('[ComfyUI] ✓ Detected native ComfyUI format - converting to API format');
        console.log('[ComfyUI] Native workflow has', workflow.nodes.length, 'nodes');
        
        // Check for groups
        if (workflow.groups && Array.isArray(workflow.groups)) {
          console.log('[ComfyUI] Native workflow has', workflow.groups.length, 'groups');
          const groupTitles = workflow.groups.map((g: any) => `${g.id}:${g.title || 'unnamed'}`).join(', ');
          console.log('[ComfyUI] Groups:', groupTitles);
          
          // Check for Segmentation group
          const segmentationGroup = workflow.groups.find((g: any) => g.id === 6 || g.title === 'Segmentation');
          if (segmentationGroup) {
            console.log('[ComfyUI] ✓ Segmentation group found:', {
              id: segmentationGroup.id,
              title: segmentationGroup.title,
              flags: segmentationGroup.flags || 'none',
            });
            // #region agent log
            fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:275',message:'Segmentation group found in native workflow',data:{id:segmentationGroup.id,title:segmentationGroup.title,flags:segmentationGroup.flags},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C,D'})}).catch(()=>{});
            // #endregion
          } else {
            console.warn('[ComfyUI] ⚠ Segmentation group not found in workflow');
            // #region agent log
            fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:280',message:'Segmentation group NOT found',data:{availableGroups:workflow.groups.map((g:any)=>`${g.id}:${g.title}`)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          }
        } else {
          console.warn('[ComfyUI] ⚠ No groups found in native workflow');
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:283',message:'No groups in workflow',data:{workflowType:isNativeFormat(workflow)?'native':'api'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A,C'})}).catch(()=>{});
          // #endregion
        }
        
        // List all node IDs in native workflow
        const nativeNodeIds = workflow.nodes.map((n: any) => n.id).sort((a: number, b: number) => a - b);
        console.log('[ComfyUI] Native workflow node IDs:', nativeNodeIds.join(', '));
        
        // Store native format for group control
        this.baseNativeWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
        const converted = this.convertNativeToAPIFormat(workflow);
        this.baseWorkflow = converted;
        return JSON.parse(JSON.stringify(converted)); // Deep clone
      } else {
        console.log('[ComfyUI] Workflow is NOT in native format (assuming API format)');
        console.log('[ComfyUI] Workflow keys:', Object.keys(workflow).slice(0, 20).join(', '));
        
        // PERFORMANCE: Only load native format once and cache it
        // Check if we already have segmentation nodes in API format - if so, skip native loading
        const hasAllSegmentationNodes = [59, 60, 61, 62, 63, 81, 83].every(id => workflow[String(id)]);
        
        if (!hasAllSegmentationNodes && !this.baseNativeWorkflow) {
          // Only load native format if we're missing segmentation nodes AND haven't loaded it yet
          const possibleNativePaths = [
            path.join(path.dirname(this.workflowPath), 'Comfyui API.json'),
            path.join(
              path.dirname(this.workflowPath),
              '..',
              'ComfyUI',
              'user',
              'default',
              'workflows',
              'Comfyui API.json'
            ),
            path.resolve(
              process.cwd(),
              '..',
              '..',
              'Image Generator',
              'ComfyUI_windows_portable',
              'ComfyUI',
              'user',
              'default',
              'workflows',
              'Comfyui API.json'
            )
          ];
          
          for (const nativeWorkflowPath of possibleNativePaths) {
            try {
              if (fs.existsSync(nativeWorkflowPath)) {
                const nativeContent = fs.readFileSync(nativeWorkflowPath, 'utf-8');
                const nativeParsed = JSON.parse(nativeContent);
                if (isNativeFormat(nativeParsed)) {
                  // Cache native workflow - only load once
                  this.baseNativeWorkflow = JSON.parse(JSON.stringify(nativeParsed)); // Deep clone
                  console.log('[ComfyUI] ✓ Cached native format workflow with', this.baseNativeWorkflow.nodes.length, 'nodes');
                  
                  // Convert once and merge missing nodes
                  const nativeConverted = this.convertNativeToAPIFormat(this.baseNativeWorkflow);
                  const segmentationNodeIds = [59, 60, 61, 62, 63, 81, 83];
                  for (const nodeId of segmentationNodeIds) {
                    if (nativeConverted[String(nodeId)] && !workflow[String(nodeId)]) {
                      workflow[String(nodeId)] = nativeConverted[String(nodeId)];
                    }
                  }
                  break; // Found it, stop looking
                }
              }
            } catch (error) {
              continue;
            }
          }
        } else if (hasAllSegmentationNodes) {
          console.log('[ComfyUI] ✓ All segmentation nodes present in API format - skipping native load');
        } else if (this.baseNativeWorkflow) {
          console.log('[ComfyUI] ✓ Using cached native workflow');
        }
      }
      
      // Already in API format
      this.baseWorkflow = workflow; // Cache for this instance
      // baseNativeWorkflow may have been set above if native format was found
      return JSON.parse(JSON.stringify(workflow)); // Deep clone
    } catch (error) {
      console.error('[ComfyUI] Failed to load workflow:', error);
      throw new Error(`Failed to load ComfyUI workflow from ${this.workflowPath}`);
    }
  }

  /**
   * Modify native workflow format (for Segmentation group control via GroupController node)
   * Now uses GroupController node instead of directly modifying flags
   */
  private modifyNativeWorkflow(nativeWorkflow: ComfyUINativeWorkflow, options: WorkflowOptions): void {
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:329',message:'modifyNativeWorkflow called',data:{enableSegmentation:options.enableSegmentation,groupsCount:nativeWorkflow.groups?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Find Segmentation group (id: 6 or title: "Segmentation")
    const segmentationGroup = nativeWorkflow.groups?.find((g: any) => g.id === 6 || g.title === 'Segmentation');
    
    if (segmentationGroup) {
      // Initialize flags if needed (for fallback)
      if (!segmentationGroup.flags) {
        segmentationGroup.flags = {};
      }
      
      if (options.enableSegmentation) {
        // Enable Segmentation group for combat rooms
        // Set mode to "always" to enable the group (matches "Set Group Nodes to Always")
        segmentationGroup.flags.mode = 'always';
        // Remove bypass flag if it exists
        delete segmentationGroup.flags.bypass;
        console.log('[ComfyUI] ✓ Segmentation group enabled (always mode) for combat room');
        console.log('[ComfyUI] Group flags:', JSON.stringify(segmentationGroup.flags, null, 2));
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:342',message:'Segmentation group enabled',data:{mode:segmentationGroup.flags.mode,flags:segmentationGroup.flags},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else {
        // Disable Segmentation group for normal rooms
        // Set mode to "bypass" to disable the group (matches "Bypass Group Nodes")
        segmentationGroup.flags.mode = 'bypass';
        // Alternative: could also use segmentationGroup.flags.bypass = true
        console.log('[ComfyUI] ✓ Segmentation group disabled (bypass mode) for normal room');
        console.log('[ComfyUI] Group flags:', JSON.stringify(segmentationGroup.flags, null, 2));
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:350',message:'Segmentation group disabled',data:{mode:segmentationGroup.flags.mode,flags:segmentationGroup.flags},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    } else {
      console.warn('[ComfyUI] ⚠ Segmentation group not found in workflow');
      if (nativeWorkflow.groups) {
        console.warn('[ComfyUI] Available groups:', nativeWorkflow.groups.map((g: any) => `ID: ${g.id}, Title: ${g.title}`).join(', '));
      } else {
        console.warn('[ComfyUI] No groups found in workflow');
      }
    }
  }

  /**
   * Modify workflow with options
   */
  private modifyWorkflow(workflow: ComfyUIWorkflow, options: WorkflowOptions): ComfyUIWorkflow {
    // If we have native workflow, modify it first (for group flags control)
    if (this.baseNativeWorkflow) {
      const nativeClone = JSON.parse(JSON.stringify(this.baseNativeWorkflow));
      this.modifyNativeWorkflow(nativeClone, options);
      // Re-convert to API format with modifications
      const converted = this.convertNativeToAPIFormat(nativeClone);
      // Merge converted workflow with existing modifications
      Object.assign(workflow, converted);
    }
    
    // PERFORMANCE: Skip debug logging to reduce overhead
    // const nodeIds = Object.keys(workflow);
    // console.log('[ComfyUI] Workflow node IDs:', nodeIds.sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
    
    // Modify GroupController node (#92) to control Segmentation group
    // PERFORMANCE: Only modify if node exists, skip logging if not found (avoid overhead)
    if (workflow['92'] && workflow['92'].class_type === 'GroupControllerNode') {
      workflow['92'].inputs.group_name = 'Segmentation';
      workflow['92'].inputs.enabled = options.enableSegmentation ? 'enable' : 'disable';
      // Only log in debug mode to avoid console overhead
      if (process.env.DEBUG) {
        console.log(`[ComfyUI] ✓ GroupController node #92 set to ${options.enableSegmentation ? 'enable' : 'disable'} Segmentation group`);
      }
    }
    
    // Modify node #45 (CLIP Text Encode) with prompt
    if (options.prompt && workflow['45']) {
      workflow['45'].inputs.text = options.prompt;
    }

    // Modify node #41 (EmptySD3LatentImage) with dimensions
    if (workflow['41']) {
      if (options.width) {
        workflow['41'].inputs.width = options.width;
      }
      if (options.height) {
        workflow['41'].inputs.height = options.height;
      }
    }

    // Modify node #44 (KSampler) with seed and steps
    if (workflow['44']) {
      if (options.seed !== undefined) {
        workflow['44'].inputs.seed = options.seed;
      } else {
        // Random seed if not provided
        workflow['44'].inputs.seed = Math.floor(Math.random() * 1000000000000000);
      }
      if (options.numSteps !== undefined) {
        workflow['44'].inputs.steps = options.numSteps;
      }
    }

    // Modify node #59 (SAM3 Segmentation) for segmentation
    if (options.enableSegmentation && workflow['59']) {
      workflow['59'].inputs.prompt = options.segmentationPrompt || 'character';
      // Ensure model stays loaded for performance (don't unload between runs)
      // This is critical for performance - reloading SAM3 model takes 5-10 seconds
      workflow['59'].inputs.unload_model = false;
      console.log('[ComfyUI] ✓ SAM3 model set to stay loaded (unload_model=false) for faster execution');
      
      // Optimize device setting - use GPU if available
      if (workflow['59'].inputs.device === 'Auto' || !workflow['59'].inputs.device) {
        workflow['59'].inputs.device = 'Auto'; // Auto should use GPU if available
        console.log('[ComfyUI] ✓ SAM3 device set to Auto (will use GPU if available)');
      }
    }

    // When Segmentation group is bypassed, node 84 needs to connect to node 46 instead of node 43
    // Node 43 is in the Segmentation group and won't exist when the group is bypassed
    // Node 46 (VAEDecode) outputs the base image and is outside the Segmentation group
    if (!options.enableSegmentation && workflow['84']) {
      // Check if node 84 has a connection to node 43 (which is in the bypassed Segmentation group)
      // If so, change it to connect to node 46 (VAEDecode - base image output)
      const node84Inputs = workflow['84'].inputs;
      if (node84Inputs) {
        // Find any input that references nodes in bypassed groups (43, 59, 61, 81, etc.)
        const bypassedNodeIds = [43, 59, 60, 61, 62, 63, 81, 83];
        for (const [inputName, inputValue] of Object.entries(node84Inputs)) {
          if (Array.isArray(inputValue) && bypassedNodeIds.includes(inputValue[0])) {
            // Change connection from bypassed node to node 46 (VAEDecode)
            console.log(`[ComfyUI] Reconnecting node 84 input "${inputName}" from node ${inputValue[0]} to node 46 (VAEDecode - Segmentation group bypassed)`);
            node84Inputs[inputName] = [46, inputValue[1] || 0]; // Keep the same output index or default to 0
          }
        }
      }
    }

    // Node #87 (Fast Groups Bypasser) has been removed - group flags are now controlled directly

    return workflow;
  }

  /**
   * Convert API format workflow back to native format (for frontend_only nodes like #87)
   */
  private convertAPIToNativeFormat(apiWorkflow: ComfyUIWorkflow, originalNative: ComfyUINativeWorkflow | null): ComfyUINativeWorkflow | null {
    if (!originalNative) {
      return null; // Can't convert back without original
    }
    
    // Create a deep clone of the original native workflow
    const nativeWorkflow = JSON.parse(JSON.stringify(originalNative));
    
    // Update nodes with modifications from API format
    for (const [nodeId, apiNode] of Object.entries(apiWorkflow)) {
      const nativeNode = nativeWorkflow.nodes.find((n: any) => String(n.id) === nodeId);
      if (nativeNode) {
        // Update inputs from API format
        if (apiNode.inputs) {
          // Map API format inputs back to native format widgets_values
          // This is complex, so for now we'll preserve the node as-is if it has properties
          // and update properties if they were modified
          if (apiNode.properties) {
            nativeNode.properties = { ...nativeNode.properties, ...apiNode.properties };
          }
        }
      }
    }
    
    return nativeWorkflow;
  }

  /**
   * Queue a workflow for execution
   */
  async queueWorkflow(options: WorkflowOptions): Promise<string> {
    const workflow = this.loadWorkflow();
    const modifiedWorkflow = this.modifyWorkflow(workflow, options);
    
    // If we have native workflow, modify it to control group flags
    // Note: ComfyUI API typically only accepts nodes in API format, but group flags
    // might need to be set in the workflow file itself, or we may need to send
    // the full workflow structure. For now, we'll modify the native workflow
    // and convert nodes to API format, but the group flags modification happens
    // in the native workflow which should be read by ComfyUI when it loads the workflow.
    let workflowToSend: any = modifiedWorkflow;
    
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/08331948-86a3-4f5f-b660-2645d043da0c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'comfyui-client.ts:479',message:'queueWorkflow: checking for native workflow',data:{hasBaseNative:!!this.baseNativeWorkflow,enableSegmentation:options.enableSegmentation},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // If workflow is in API format (not native), we need to handle it differently
    if (!this.baseNativeWorkflow) {
      // Workflow is in API format - handle segmentation nodes
      // PERFORMANCE: Skip logging to reduce overhead
      const hasSegmentationNodes = [59, 60, 61, 62, 63, 81, 83].every(id => workflowToSend[String(id)]);
      
      if (!options.enableSegmentation) {
        // For normal rooms, remove segmentation nodes if they exist
        // PERFORMANCE: Remove nodes silently (no logging overhead)
        const segmentationNodeIds = [59, 60, 61, 62, 63, 81, 83];
        for (const nodeId of segmentationNodeIds) {
          if (workflowToSend[String(nodeId)]) {
            delete workflowToSend[String(nodeId)];
          }
        }
      }
      
      workflowToSend = modifiedWorkflow;
    } else {
      // PERFORMANCE: Use API format directly - groups controlled via node removal
      // Skip expensive native format conversion and file writing on every request
      workflowToSend = modifiedWorkflow;
      
      // Remove segmentation nodes if disabled (faster than group flags)
      // PERFORMANCE: Remove nodes silently (no logging overhead)
      if (!options.enableSegmentation) {
        const segmentationNodeIds = [59, 60, 61, 62, 63, 81, 83];
        for (const nodeId of segmentationNodeIds) {
          delete workflowToSend[String(nodeId)];
        }
      }
    }

    try {
      // ComfyUI's /prompt endpoint accepts either:
      // 1. Just nodes in API format: { prompt: { "1": {...}, "2": {...} } }
      // 2. Full workflow structure with extra data (may include groups)
      // 
      // For GroupController node to work, we need to include groups in the request
      // so the node can modify them before execution.
      const apiRequest: any = {
        prompt: workflowToSend,
        client_id: this.clientId,
      };
      
      // PERFORMANCE: Remove GroupController node from workflow before sending
      // It's a control node that doesn't need to execute - removing it prevents ComfyUI
      // from validating/processing it, which was causing 8-10 second slowdown
      // We've already read its inputs and applied group control by removing/keeping segmentation nodes
      if (workflowToSend['92'] && workflowToSend['92'].class_type === 'GroupControllerNode') {
        delete workflowToSend['92'];
      }
      
      // PERFORMANCE: Don't include groups in extra_data - we handle group control directly
      // by removing/keeping segmentation nodes, which is much faster than group flags
      
      const response = await fetch(`${this.serverUrl}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ComfyUI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: ComfyUIResponse = await response.json();
      console.log('[ComfyUI] Workflow queued with prompt_id:', result.prompt_id);
      return result.prompt_id;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`ComfyUI server not reachable at ${this.serverUrl}. Is the server running?`);
      }
      throw error;
    }
  }

  /**
   * Poll workflow status until completion
   * Increased timeout to 60 seconds to handle model loading delays
   */
  async pollWorkflowStatus(promptId: string, maxWaitTime: number = 60000): Promise<ComfyUIHistoryItem> {
    const startTime = Date.now();
    let pollInterval = 500; // Start with 500ms polling
    let consecutiveErrors = 0;
    const maxErrors = 5;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const history = await this.getHistory();
        
        // Find the workflow in history
        const workflowHistory = history[promptId];
        if (workflowHistory) {
          const status = workflowHistory.status?.status_str;
          
          if (status === 'success') {
            console.log(`[ComfyUI] Workflow ${promptId} completed successfully`);
            return workflowHistory;
          }
          
          if (status === 'error') {
            console.error(`[ComfyUI] Workflow ${promptId} failed with error status`);
            return workflowHistory;
          }
          
          // Workflow is still processing
          const elapsed = Date.now() - startTime;
          const progress = workflowHistory.status?.completed || 0;
          const queued = workflowHistory.status?.queued || 0;
          
          if (elapsed % 5000 < pollInterval) { // Log every 5 seconds
            console.log(`[ComfyUI] Workflow ${promptId} still processing... (${elapsed}ms elapsed, ${progress} completed, ${queued} queued)`);
          }
        } else {
          // Workflow not in history yet - might still be queued
          const elapsed = Date.now() - startTime;
          if (elapsed % 5000 < pollInterval) { // Log every 5 seconds
            console.log(`[ComfyUI] Workflow ${promptId} not in history yet (${elapsed}ms elapsed - may still be queued)`);
          }
        }

        // Reset error counter on successful poll
        consecutiveErrors = 0;
        
        // Exponential backoff: increase interval if we've been waiting a while
        const elapsed = Date.now() - startTime;
        if (elapsed > 20000) {
          pollInterval = 1000; // Poll every 1 second after 20 seconds
        } else if (elapsed > 40000) {
          pollInterval = 2000; // Poll every 2 seconds after 40 seconds
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        consecutiveErrors++;
        console.warn(`[ComfyUI] Error polling status (attempt ${consecutiveErrors}/${maxErrors}):`, error);
        
        if (consecutiveErrors >= maxErrors) {
          throw new Error(`Failed to poll workflow status after ${maxErrors} consecutive errors: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Wait longer on error before retrying
        await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
      }
    }

    const elapsed = Date.now() - startTime;
    throw new Error(`Workflow ${promptId} timed out after ${elapsed}ms (${maxWaitTime}ms limit). The workflow may still be processing - check ComfyUI server.`);
  }

  /**
   * Get workflow history
   */
  async getHistory(): Promise<{ [promptId: string]: ComfyUIHistoryItem }> {
    try {
      const response = await fetch(`${this.serverUrl}/history`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`ComfyUI history API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`ComfyUI server not reachable at ${this.serverUrl}. Is the server running?`);
      }
      throw error;
    }
  }

  /**
   * Get image URL from workflow result
   * Returns Next.js proxy URL to avoid CORS issues
   */
  getImageUrl(filename: string, subfolder: string = '', type: string = 'output'): string {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });
    // Use Next.js proxy route to avoid CORS issues
    return `/api/comfyui-image?${params.toString()}`;
  }

  /**
   * Extract image URLs from workflow history
   */
  extractImageUrls(historyItem: ComfyUIHistoryItem): string[] {
    const urls: string[] = [];
    
    if (!historyItem.outputs) {
      return urls;
    }

    // Check all output nodes for images
    for (const [nodeId, output] of Object.entries(historyItem.outputs)) {
      if (output.images && Array.isArray(output.images)) {
        for (const image of output.images) {
          const url = this.getImageUrl(image.filename, image.subfolder || '', image.type || 'output');
          urls.push(url);
        }
      }
    }

    return urls;
  }

  /**
   * Execute workflow and wait for completion
   */
  async executeWorkflow(options: WorkflowOptions): Promise<string[]> {
    const promptId = await this.queueWorkflow(options);
    const historyItem = await this.pollWorkflowStatus(promptId);
    
    if (historyItem.status?.status_str === 'error') {
      throw new Error(`Workflow execution failed for prompt_id: ${promptId}`);
    }

    return this.extractImageUrls(historyItem);
  }

  /**
   * Check if ComfyUI server is reachable
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/system_stats`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server URL (for internal use)
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Get client ID (for internal use)
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Upload an image to ComfyUI input folder
   * @param imageUrl - URL of the image to upload (can be proxy URL or direct ComfyUI URL)
   * @param filename - Optional filename (defaults to timestamp-based name)
   * @returns The filename that can be used in workflows
   */
  async uploadImage(imageUrl: string, filename?: string): Promise<string> {
    try {
      let imageFetchUrl = imageUrl;
      
      // If it's a proxy URL, convert it to direct ComfyUI URL
      if (imageUrl.startsWith('/api/comfyui-image')) {
        const url = new URL(imageUrl, 'http://localhost'); // Base URL doesn't matter, we just need to parse
        const params = url.searchParams;
        const fileParam = params.get('filename');
        const subfolder = params.get('subfolder') || '';
        const type = params.get('type') || 'output';
        
        if (!fileParam) {
          throw new Error('Proxy URL missing filename parameter');
        }
        
        // Build direct ComfyUI view URL
        const comfyParams = new URLSearchParams({
          filename: fileParam,
          subfolder,
          type,
        });
        imageFetchUrl = `${this.serverUrl}/view?${comfyParams.toString()}`;
        console.log('[ComfyUI] Converted proxy URL to direct ComfyUI URL:', imageFetchUrl);
      }
      
      // Fetch the image as a blob
      const response = await fetch(imageFetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Generate filename if not provided
      if (!filename) {
        const timestamp = Date.now();
        filename = `combat_room_${timestamp}.png`;
      }

      // Ensure PNG format
      if (!filename.toLowerCase().endsWith('.png')) {
        filename = filename.replace(/\.[^/.]+$/, '') + '.png';
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', blob, filename);
      formData.append('type', 'input');
      formData.append('overwrite', 'true');

      // Upload to ComfyUI
      const uploadResponse = await fetch(`${this.serverUrl}/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`ComfyUI upload error: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      const result = await uploadResponse.json();
      console.log('[ComfyUI] Image uploaded successfully:', filename);
      
      // Return the filename that can be used in workflows
      return filename;
    } catch (error) {
      console.error('[ComfyUI] Error uploading image:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw error;
    }
  }
}

// Singleton instance
let comfyUIClientInstance: ComfyUIClient | null = null;

/**
 * Clear the ComfyUI client instance (forces recreation with new settings)
 */
export function clearComfyUIClient(): void {
  if (comfyUIClientInstance) {
    (comfyUIClientInstance as any).clearWorkflowCache();
  }
  comfyUIClientInstance = null;
  console.log('[ComfyUI] Client instance cleared - will be recreated with new settings');
}

/**
 * Get or create ComfyUI client instance
 */
export function getComfyUIClient(): ComfyUIClient {
  if (!comfyUIClientInstance) {
    const serverUrl = process.env.COMFYUI_SERVER_URL || 'http://127.0.0.1:8188';
    let workflowPath = process.env.COMFYUI_WORKFLOW_PATH;
    
    // Check if environment variable points to old path and ignore it
    if (workflowPath) {
      const isOldPath = workflowPath.includes('Api Workflow') || 
                       (workflowPath.includes('Comfy API.json') && !workflowPath.includes('Comfyui API.json'));
      if (isOldPath) {
        console.warn('[ComfyUI] ⚠ Environment variable COMFYUI_WORKFLOW_PATH points to old workflow path');
        console.warn('[ComfyUI] ⚠ Ignoring environment variable - will use default path instead');
        workflowPath = undefined; // Don't pass it to constructor, let it use default
      }
    }
    
    console.log('[ComfyUI] Creating new client instance');
    console.log('[ComfyUI] Environment variable COMFYUI_WORKFLOW_PATH:', process.env.COMFYUI_WORKFLOW_PATH || 'not set (will use default)');
    console.log('[ComfyUI] Workflow path to use:', workflowPath || 'default (will be resolved in constructor)');
    comfyUIClientInstance = new ComfyUIClient(serverUrl, workflowPath);
    // Access private property for logging
    console.log('[ComfyUI] Client instance created with workflow path:', (comfyUIClientInstance as any).workflowPath);
  }
  return comfyUIClientInstance;
}

