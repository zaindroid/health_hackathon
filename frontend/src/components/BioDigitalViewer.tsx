/**
 * BioDigital 3D Anatomy Viewer Component
 * Automatically responds to camera commands from the voice agent
 */

import { useEffect, useRef } from 'react';

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

export function BioDigitalViewer() {
  const humanRef = useRef<any>(null);
  const isInitialized = useRef(false);

  /**
   * Initialize BioDigital Human API
   */
  useEffect(() => {
    // Load HumanAPI script
    const script = document.createElement('script');
    script.src = 'https://developer.biodigital.com/builds/api/human-api-3.0.0.min.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ BioDigital HumanAPI script loaded');

      if (window.HumanAPI && !isInitialized.current) {
        try {
          const human = new window.HumanAPI('biodigital-viewer');
          humanRef.current = human;

          human.on('human.ready', () => {
            console.log('✅ BioDigital 3D Viewer is ready');
            console.log('🎙️  Voice agent can now control the 3D model');
            isInitialized.current = true;

            // Set default front view
            human.send('camera.set', {
              position: { x: 1.52, y: 161.48, z: -62.83 },
              target: { x: 1.03, y: 158.82, z: -15.39 },
              animate: true,
              duration: 1000,
            });
          });

          human.on('human.error', (error: any) => {
            console.error('❌ BioDigital Viewer error:', error);
          });
        } catch (error) {
          console.error('❌ Error initializing HumanAPI:', error);
        }
      }
    };

    script.onerror = () => {
      console.error('❌ Failed to load BioDigital HumanAPI script');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
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

      if (!humanRef.current) {
        console.warn('⚠️  BioDigital viewer not ready yet');
        return;
      }

      try {
        if (cameraCommand.action === 'camera.set') {
          // Pan camera to specific position/target
          humanRef.current.send('camera.set', cameraCommand.params);
          console.log('✅ Camera panned to new position');
        } else if (cameraCommand.action === 'camera.flyTo') {
          // Fly camera to specific object
          humanRef.current.send('camera.flyTo', cameraCommand.params);
          console.log(`✅ Camera flying to: ${cameraCommand.objectName || cameraCommand.params.objectId}`);
        }
      } catch (error) {
        console.error('❌ Error executing camera command:', error);
      }
    };

    // Listen for custom events from voice agent
    window.addEventListener('biodigital-camera-command' as any, handleCameraCommand);

    return () => {
      window.removeEventListener('biodigital-camera-command' as any, handleCameraCommand);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Info Banner */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-semibold text-gray-800">
          🎙️ Voice-Controlled 3D Anatomy
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Say "show me the front view" or "rotate to the back"
        </p>
      </div>

      {/* BioDigital Iframe */}
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
