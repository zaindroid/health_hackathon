/**
 * BioDigital 3D Anatomy Viewer Component
 * Automatically responds to camera commands from the voice agent
 */

import { useEffect, useRef, useState } from 'react';

// Declare HumanAPI types
declare global {
  interface Window {
    HumanAPI: any;
  }
}

interface CameraCommand {
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

const BIODIGITAL_IFRAME_URL =
  'https://human.biodigital.com/viewer/?id=6cr6&ui-anatomy-descriptions=true&ui-anatomy-pronunciations=true&ui-anatomy-labels=true&ui-audio=true&ui-chapter-list=false&ui-fullscreen=true&ui-help=true&ui-info=true&ui-label-list=true&ui-layers=true&ui-skin-layers=true&ui-loader=circle&ui-media-controls=full&ui-menu=true&ui-nav=true&ui-search=true&ui-tools=true&ui-tutorial=false&ui-undo=true&ui-whiteboard=true&initial.none=true&disable-scroll=false&uaid=ML3xE&paid=o_22e32b94';

const DEFAULT_MODEL_NAME = 'Neck, Shoulders & Upper Back';
const DEFAULT_VIEWPOINT_NAME = 'Front View';
const DEFAULT_REASON = 'Say "show me the front view" or ask about any muscle or bone.';

interface ViewerModelDetail {
  modelId: string;
  modelName: string;
  biodigitalUrl: string;
  viewpointId?: string;
  viewpointName?: string;
  autoSelected?: boolean;
  reason?: string;
  matchedTerms?: string[];
}

export function BioDigitalViewer() {
  const humanRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const pendingModelRef = useRef<ViewerModelDetail | null>(null);
  const latestModelRef = useRef<ViewerModelDetail | null>(null);

  const [bannerInfo, setBannerInfo] = useState({
    modelName: DEFAULT_MODEL_NAME,
    viewpointName: DEFAULT_VIEWPOINT_NAME,
    reason: DEFAULT_REASON,
    autoSelected: false,
  });

  const extractSceneId = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('id');
    } catch (error) {
      console.warn('⚠️ Invalid BioDigital URL provided:', error);
      return null;
    }
  };

  const tryLoadScene = (detail: ViewerModelDetail): boolean => {
    if (!detail || !humanRef.current || !isInitialized.current) {
      return false;
    }

    const sceneId = extractSceneId(detail.biodigitalUrl);
    if (!sceneId) {
      return false;
    }

    try {
      if (humanRef.current.scene?.load) {
        humanRef.current.scene.load(sceneId);
      } else if (humanRef.current.send) {
        humanRef.current.send('scene.load', { id: sceneId });
      }
      console.log(`✅ BioDigital scene loaded: ${sceneId}`);
      return true;
    } catch (error) {
      console.error('❌ Error loading BioDigital scene:', error);
      return false;
    }
  };

  const applyBanner = (detail: ViewerModelDetail | null) => {
    if (!detail) {
      setBannerInfo({
        modelName: DEFAULT_MODEL_NAME,
        viewpointName: DEFAULT_VIEWPOINT_NAME,
        reason: DEFAULT_REASON,
        autoSelected: false,
      });
      return;
    }

    setBannerInfo({
      modelName: detail.modelName || DEFAULT_MODEL_NAME,
      viewpointName: detail.viewpointName || DEFAULT_VIEWPOINT_NAME,
      reason: detail.reason || DEFAULT_REASON,
      autoSelected: Boolean(detail.autoSelected),
    });
  };

  /**
   * Initialize BioDigital Human API
   */
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://developer.biodigital.com/builds/api/human-api-3.0.0.min.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ BioDigital HumanAPI script loaded');

      if (!window.HumanAPI) {
        console.error('❌ HumanAPI unavailable after script load');
        return;
      }

      try {
        const human = new window.HumanAPI('biodigital-viewer');
        humanRef.current = human;

        human.on('human.ready', () => {
          console.log('✅ BioDigital 3D Viewer is ready');
          console.log('🎙️  Voice agent can now control the 3D model');
          isInitialized.current = true;

          const pending = pendingModelRef.current;
          if (pending) {
            applyBanner(pending);
            const loaded = tryLoadScene(pending);
            if (loaded) {
              pendingModelRef.current = null;
            }
          } else {
            applyBanner(latestModelRef.current);
            human.send('camera.set', {
              position: { x: 1.52, y: 161.48, z: -62.83 },
              target: { x: 1.03, y: 158.82, z: -15.39 },
              animate: true,
              duration: 1000,
            });
          }
        });

        human.on('human.error', (error: any) => {
          console.error('❌ BioDigital Viewer error:', error);
        });
      } catch (error) {
        console.error('❌ Error initializing HumanAPI:', error);
      }
    };

    script.onerror = () => {
      console.error('❌ Failed to load BioDigital HumanAPI script');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  /**
   * Listen for camera commands from voice agent
   */
  useEffect(() => {
    const handleCameraCommand = (event: CustomEvent<CameraCommand>) => {
      const cameraCommand = event.detail;
      console.log('📹 Executing camera command:', cameraCommand);

      if (!humanRef.current || !isInitialized.current) {
        console.warn('⚠️  BioDigital viewer not ready yet');
        return;
      }

      try {
        if (cameraCommand.action === 'camera.set') {
          humanRef.current.send('camera.set', cameraCommand.params);
          console.log('✅ Camera panned to new position');
        } else if (cameraCommand.action === 'camera.flyTo') {
          humanRef.current.send('camera.flyTo', cameraCommand.params);
          console.log(`✅ Camera flying to: ${cameraCommand.objectName || cameraCommand.params.objectId}`);
        }
      } catch (error) {
        console.error('❌ Error executing camera command:', error);
      }
    };

    window.addEventListener('biodigital-camera-command' as any, handleCameraCommand);

    return () => {
      window.removeEventListener('biodigital-camera-command' as any, handleCameraCommand);
    };
  }, []);

  /**
   * Handle viewer model load events
   */
  useEffect(() => {
    const handleModelLoad = (event: CustomEvent<ViewerModelDetail>) => {
      const detail = event.detail;
      console.log('🧭 Received viewer model update:', detail);

      latestModelRef.current = detail;
      applyBanner(detail);

      const loaded = tryLoadScene(detail);
      if (!loaded) {
        pendingModelRef.current = detail;
        setTimeout(() => {
          if (pendingModelRef.current && pendingModelRef.current.modelId === detail.modelId) {
            const retried = tryLoadScene(detail);
            if (retried) {
              pendingModelRef.current = null;
            }
          }
        }, 1000);
      } else {
        pendingModelRef.current = null;
      }
    };

    window.addEventListener('biodigital-load-model' as any, handleModelLoad);

    return () => {
      window.removeEventListener('biodigital-load-model' as any, handleModelLoad);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg max-w-xs">
        <p className="text-sm font-semibold text-gray-800">{bannerInfo.modelName}</p>
        <p className="text-xs text-gray-600 mt-1">View: {bannerInfo.viewpointName}</p>
        <p className="text-xs text-gray-500 mt-1">{bannerInfo.reason}</p>
        {bannerInfo.autoSelected && (
          <p className="text-[11px] text-emerald-600 mt-1">Auto-matched from conversation</p>
        )}
      </div>

      <iframe
        id="biodigital-viewer"
        src={BIODIGITAL_IFRAME_URL}
        className="w-full h-full border-0 rounded-lg"
        allow="xr-spatial-tracking"
        title="3D Anatomy Viewer"
      />
    </div>
  );
}
