/**
 * Anatomy Navigator - 3D Camera Navigation Tool
 * Provides tool calls for navigating the BioDigital 3D anatomy viewer
 * by looking up camera coordinates from the database
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CameraPosition {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface CameraCommand {
  action: 'camera.set' | 'camera.flyTo';
  params: {
    position?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
    objectId?: string;
    animate?: boolean;
    duration?: number;
  };
  objectName?: string;
}

export interface Viewpoint {
  id: string;
  name: string;
  buttonLabel: string;
  camera: CameraPosition;
  anatomyVisible?: any;
  description?: string;
  clinicalContext?: string;
  commonUseCases?: string[];
}

export interface AnatomyModel {
  id: string;
  name: string;
  biodigitalUrl: string;
  description: string;
  viewpoints: Viewpoint[];
}

export interface AnatomyDatabase {
  models: AnatomyModel[];
  metadata?: any;
}

export class AnatomyNavigator {
  private data: AnatomyDatabase;
  private currentModelId: string = 'neck_shoulders_upper_back';

  constructor(databasePath?: string) {
    const dbPath = databasePath || path.join(__dirname, '../navigation_tests/anatomy-data.json');
    this.data = this.loadDatabase(dbPath);
    console.log('✅ Anatomy Navigator initialized');
    console.log(`   Default model: ${this.currentModelId}`);
  }

  private loadDatabase(dbPath: string): AnatomyDatabase {
    try {
      const fileContent = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('❌ Failed to load anatomy database:', error);
      throw new Error(`Failed to load anatomy database from ${dbPath}`);
    }
  }

  /**
   * Get model by ID
   */
  private getModelById(modelId: string): AnatomyModel | null {
    const model = this.data.models.find((m) => m.id === modelId);
    return model || null;
  }

  /**
   * Get viewpoint camera coordinates
   */
  private getViewpointCamera(modelId: string, viewpointId: string): CameraPosition | null {
    const model = this.getModelById(modelId);
    if (!model) {
      console.error(`[-] Model not found: ${modelId}`);
      return null;
    }

    const viewpoint = model.viewpoints.find((vp) => vp.id === viewpointId);
    if (!viewpoint) {
      console.error(`[-] Viewpoint not found: ${viewpointId} in model ${modelId}`);
      return null;
    }

    return viewpoint.camera;
  }

  /**
   * Generate camera pan command
   */
  private cameraPanTo(position: CameraPosition, animate: boolean = true, duration: number = 1000): CameraCommand {
    return {
      action: 'camera.set',
      params: {
        position: position.position,
        target: position.target,
        animate,
        duration,
      },
    };
  }

  // ==================== TOOL CALLS ====================

  /**
   * TOOL: Navigate to front view
   */
  showFrontView(modelId?: string): CameraCommand | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    console.log(`[+] Found model: ${model.name}`);
    console.log(`[*] Finding coordinates for 'front' viewpoint...`);

    const cameraPos = this.getViewpointCamera(targetModelId, 'front');
    if (!cameraPos) {
      return { error: 'Front viewpoint not found' };
    }

    console.log(`[+] Found coordinates: position=${JSON.stringify(cameraPos.position)}, target=${JSON.stringify(cameraPos.target)}`);
    console.log(`[>] Generating camera pan command...`);

    const command = this.cameraPanTo(cameraPos);
    console.log(`[+] Camera command generated`);

    return command;
  }

  /**
   * TOOL: Navigate to back view
   */
  showBackView(modelId?: string): CameraCommand | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    console.log(`[+] Found model: ${model.name}`);
    console.log(`[*] Finding coordinates for 'back' viewpoint...`);

    const cameraPos = this.getViewpointCamera(targetModelId, 'back');
    if (!cameraPos) {
      return { error: 'Back viewpoint not found' };
    }

    console.log(`[+] Found coordinates: position=${JSON.stringify(cameraPos.position)}, target=${JSON.stringify(cameraPos.target)}`);
    console.log(`[>] Generating camera pan command...`);

    const command = this.cameraPanTo(cameraPos);
    console.log(`[+] Camera command generated`);

    return command;
  }

  /**
   * TOOL: Navigate to right shoulder view
   */
  showRightShoulder(modelId?: string): CameraCommand | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    console.log(`[+] Found model: ${model.name}`);
    console.log(`[*] Finding coordinates for 'right_shoulder' viewpoint...`);

    const cameraPos = this.getViewpointCamera(targetModelId, 'right_shoulder');
    if (!cameraPos) {
      return { error: 'Right shoulder viewpoint not found' };
    }

    console.log(`[+] Found coordinates: position=${JSON.stringify(cameraPos.position)}, target=${JSON.stringify(cameraPos.target)}`);
    console.log(`[>] Generating camera pan command...`);

    const command = this.cameraPanTo(cameraPos);
    console.log(`[+] Camera command generated`);

    return command;
  }

  /**
   * TOOL: Navigate to left shoulder view
   */
  showLeftShoulder(modelId?: string): CameraCommand | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    console.log(`[+] Found model: ${model.name}`);
    console.log(`[*] Finding coordinates for 'left_shoulder' viewpoint...`);

    const cameraPos = this.getViewpointCamera(targetModelId, 'left_shoulder');
    if (!cameraPos) {
      return { error: 'Left shoulder viewpoint not found' };
    }

    console.log(`[+] Found coordinates: position=${JSON.stringify(cameraPos.position)}, target=${JSON.stringify(cameraPos.target)}`);
    console.log(`[>] Generating camera pan command...`);

    const command = this.cameraPanTo(cameraPos);
    console.log(`[+] Camera command generated`);

    return command;
  }

  /**
   * TOOL: Generic navigation to any viewpoint
   */
  navigateToViewpoint(viewpointId: string, modelId?: string): CameraCommand | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    console.log(`[+] Found model: ${model.name}`);
    console.log(`[*] Finding coordinates for '${viewpointId}' viewpoint...`);

    const cameraPos = this.getViewpointCamera(targetModelId, viewpointId);
    if (!cameraPos) {
      return { error: `Viewpoint '${viewpointId}' not found` };
    }

    console.log(`[+] Found coordinates: position=${JSON.stringify(cameraPos.position)}, target=${JSON.stringify(cameraPos.target)}`);
    console.log(`[>] Generating camera pan command...`);

    const command = this.cameraPanTo(cameraPos);
    console.log(`[+] Camera command generated`);

    return command;
  }

  /**
   * TOOL: List available viewpoints
   */
  listAvailableViewpoints(modelId?: string): { model: string; viewpoints: any[] } | { error: string } {
    const targetModelId = modelId || this.currentModelId;

    console.log(`[*] Looking up model '${targetModelId}' in database...`);
    const model = this.getModelById(targetModelId);
    if (!model) {
      return { error: `Model '${targetModelId}' not found` };
    }

    const viewpoints = model.viewpoints.map((vp) => ({
      id: vp.id,
      name: vp.name,
      buttonLabel: vp.buttonLabel,
      description: vp.description,
    }));

    console.log(`[+] Found ${viewpoints.length} viewpoints`);
    return {
      model: model.name,
      viewpoints,
    };
  }

  /**
   * Set current model
   */
  setCurrentModel(modelId: string): boolean {
    const model = this.getModelById(modelId);
    if (model) {
      this.currentModelId = modelId;
      console.log(`[+] Current model set to: ${modelId}`);
      return true;
    }
    console.error(`[-] Model not found: ${modelId}`);
    return false;
  }

  /**
   * Get list of all models
   */
  listModels(): { id: string; name: string; description: string }[] {
    return this.data.models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description,
    }));
  }
}

// Singleton instance
let navigatorInstance: AnatomyNavigator | null = null;

export function getAnatomyNavigator(): AnatomyNavigator {
  if (!navigatorInstance) {
    navigatorInstance = new AnatomyNavigator();
  }
  return navigatorInstance;
}
