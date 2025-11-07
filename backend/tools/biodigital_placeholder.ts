/**
 * BioDigital Human Tool Handler
 * Implements 3D anatomy navigation using the Anatomy Navigator
 */

import { ToolHandler, ToolAction, ToolResult } from '../../shared/types';
import { getAnatomyNavigator, CameraCommand } from './anatomy_navigator';

export class BioDigitalToolHandler implements ToolHandler {
  public name = 'biodigital';
  private apiKey?: string;
  private initialized = false;
  private navigator = getAnatomyNavigator();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BIODIGITAL_API_KEY;
    console.log('✅ BioDigital Tool Handler initialized with Anatomy Navigator');
  }

  canHandle(action: ToolAction): boolean {
    const supportedOps = [
      'navigate',
      'show_front',
      'show_back',
      'show_right_shoulder',
      'show_left_shoulder',
      'list_viewpoints',
      'show_viewpoint',
    ];
    return supportedOps.includes(action.op);
  }

  async execute(action: ToolAction): Promise<ToolResult> {
    console.log(`🔧 BioDigital 3D navigation requested:`, action);

    let cameraCommand: CameraCommand | { error: string } | { model: string; viewpoints: any[] };

    try {
      switch (action.op) {
        case 'show_front':
          cameraCommand = this.navigator.showFrontView(action.params?.model_id);
          break;

        case 'show_back':
          cameraCommand = this.navigator.showBackView(action.params?.model_id);
          break;

        case 'show_right_shoulder':
          cameraCommand = this.navigator.showRightShoulder(action.params?.model_id);
          break;

        case 'show_left_shoulder':
          cameraCommand = this.navigator.showLeftShoulder(action.params?.model_id);
          break;

        case 'navigate':
        case 'show_viewpoint':
          if (!action.target) {
            return {
              success: false,
              message: 'Viewpoint ID required for navigation',
            };
          }
          cameraCommand = this.navigator.navigateToViewpoint(action.target, action.params?.model_id);
          break;

        case 'list_viewpoints':
          cameraCommand = this.navigator.listAvailableViewpoints(action.params?.model_id);
          break;

        default:
          return {
            success: false,
            message: `Unsupported operation: ${action.op}`,
          };
      }

      // Check if it's an error response
      if ('error' in cameraCommand) {
        return {
          success: false,
          message: cameraCommand.error,
        };
      }

      // Return the camera command to be sent to the frontend
      return {
        success: true,
        message: `3D navigation command generated: ${action.op}`,
        data: cameraCommand,
      };
    } catch (error: any) {
      console.error('❌ Error executing 3D navigation:', error);
      return {
        success: false,
        message: `Failed to execute navigation: ${error.message}`,
      };
    }
  }

  /**
   * Initialize BioDigital viewer
   */
  async initialize(): Promise<void> {
    // TODO: Implement initialization logic
    this.initialized = true;
  }

  /**
   * Get available anatomical structures
   */
  async getAvailableStructures(): Promise<string[]> {
    // TODO: Return list of available anatomical structures
    return [
      'heart',
      'left_ventricle',
      'right_ventricle',
      'aorta',
      'lungs',
      'brain',
      'liver',
      'kidneys',
      'skeletal_system',
      'muscular_system',
    ];
  }
}

// Singleton instance
let biodigitalInstance: BioDigitalToolHandler | null = null;

export function getBioDigitalHandler(): BioDigitalToolHandler {
  if (!biodigitalInstance) {
    biodigitalInstance = new BioDigitalToolHandler();
  }
  return biodigitalInstance;
}
