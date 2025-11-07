/**
 * BioDigital 3D Anatomy Viewer Component
 * Preloads all registered models, keeps them stacked, and reveals the
 * relevant one based on the AI assistant's context updates.
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

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CameraPositionPayload {
  position?: Vector3;
  target?: Vector3;
}

interface CatalogModel {
  modelId: string;
  modelName: string;
  biodigitalUrl: string;
  defaultViewId?: string;
  defaultCamera?: CameraPositionPayload;
}

interface ViewerCatalogPayload {
  models: CatalogModel[];
}

interface ViewerModelDetail {
  modelId?: string;
  modelName?: string;
  biodigitalUrl?: string;
  viewpointId?: string;
  viewpointName?: string;
  viewpointUrl?: string;
  camera?: CameraPositionPayload;
  autoSelected?: boolean;
  reason?: string;
  matchedTerms?: string[];
  visible?: boolean;
}

const DEFAULT_MODEL_ID = 'skeletal_system';
const DEFAULT_MODEL_NAME = 'Male Skeletal System';
const DEFAULT_BIODIGITAL_URL =
  'https://human.biodigital.com/viewer/?id=6dQE&ui-anatomy-descriptions=true&ui-anatomy-pronunciations=true&ui-anatomy-labels=false&ui-audio=false&ui-chapter-list=false&ui-fullscreen=false&ui-help=false&ui-info=false&ui-label-list=true&ui-layers=false&ui-skin-layers=false&ui-loader=circle&ui-media-controls=none&ui-menu=false&ui-nav=false&ui-search=false&ui-tools=false&ui-tutorial=false&ui-undo=false&ui-whiteboard=false&initial.none=true&disable-scroll=false&dk=c0c3685a4e0996e0095ae1a7d7cb46079b9db70a';
const DEFAULT_VIEW_ID = 'front';
const DEFAULT_CAMERA: CameraPositionPayload = {
  position: { x: -0.98, y: 83.22, z: -196.4 },
  target: { x: -0.98, y: 83.22, z: -16.4 },
};

const HEADACHE_MODEL_ID = 'headache_types_cranial_pain';
const HEADACHE_VIDEO_MAP: Record<string, string> = {
  sinus_headache: '/videos/sinus.mp4',
  tension_headache: '/videos/tension.mp4',
  migraine_headache: '/videos/migraine.mp4',
  cluster_headache: '/videos/cluster.mp4',
};
const DEFAULT_HEADACHE_VIDEO = HEADACHE_VIDEO_MAP['tension_headache'] || HEADACHE_VIDEO_MAP['migraine_headache'];
const normalizeBaseUrl = (base: string) => (base.endsWith('/') ? base.slice(0, -1) : base);
const MEDIA_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:3001');

const resolveHeadacheVideoSrc = (viewpointId?: string) => {
  const key = viewpointId && HEADACHE_VIDEO_MAP[viewpointId] ? viewpointId : undefined;
  const path = key ? HEADACHE_VIDEO_MAP[key] : DEFAULT_HEADACHE_VIDEO;
  return path ? `${MEDIA_BASE_URL}${path}` : null;
};

const DEFAULT_BANNER = {
  modelName: DEFAULT_MODEL_NAME,
  viewpointName: 'Front View',
  reason: 'Skeleton overview is ready.',
  autoSelected: false,
};

const getIframeId = (modelId: string) => `biodigital-viewer-${modelId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

const sendCameraCommandToHuman = (human: any, command: CameraCommand) => {
  if (!human) {
    return;
  }

  try {
    if (command.action === 'camera.set') {
      human.send('camera.set', command.params);
    } else if (command.action === 'camera.flyTo') {
      human.send('camera.flyTo', command.params);
    }
  } catch (error) {
    console.error('❌ Error executing camera command:', error);
  }
};

export function BioDigitalViewer() {
  const [catalog, setCatalog] = useState<ViewerCatalogPayload['models']>([
    {
      modelId: DEFAULT_MODEL_ID,
      modelName: DEFAULT_MODEL_NAME,
      biodigitalUrl: DEFAULT_BIODIGITAL_URL,
      defaultViewId: DEFAULT_VIEW_ID,
      defaultCamera: DEFAULT_CAMERA,
    },
  ]);
  const [activeModelId, setActiveModelId] = useState<string | null>(DEFAULT_MODEL_ID);
  const [bannerInfo, setBannerInfo] = useState(DEFAULT_BANNER);
  const [headacheVideoSrc, setHeadacheVideoSrc] = useState<string | null>(null);
  const [headacheVideoKey, setHeadacheVideoKey] = useState(0);

  const activeModelIdRef = useRef<string | null>(DEFAULT_MODEL_ID);
  const catalogRef = useRef(catalog);
  const scriptLoadedRef = useRef(false);
  const humanRefs = useRef<Record<string, any>>({});
  const readyModelsRef = useRef<Record<string, boolean>>({});
  const pendingActivationRef = useRef<ViewerModelDetail | null>(null);
  const pendingCameraRef = useRef<Record<string, CameraCommand[]>>({});
  const pendingSceneRef = useRef<Record<string, { id: string; uaid?: string | null } | undefined>>({});
  const preloadLinksRef = useRef<Set<string>>(new Set());

  const getModelDetail = (modelId: string) => catalogRef.current.find((model) => model.modelId === modelId);

  const ensurePreloadLink = (url: string) => {
    if (preloadLinksRef.current.has(url)) {
      return;
    }

    const existing = document.head.querySelector(`link[rel="preload"][href="${url}"]`);
    if (existing) {
      preloadLinksRef.current.add(url);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'document';
    link.href = url;
    document.head.appendChild(link);
    preloadLinksRef.current.add(url);
  };

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  const updateBanner = (detail?: ViewerModelDetail | null) => {
    if (!detail || detail.visible === false) {
      setBannerInfo(DEFAULT_BANNER);
      return;
    }

    setBannerInfo({
      modelName: detail.modelName || DEFAULT_MODEL_NAME,
      viewpointName: detail.viewpointName || 'Context View',
      reason: detail.reason || DEFAULT_BANNER.reason,
      autoSelected: Boolean(detail.autoSelected),
    });
  };

  const queueCameraCommand = (modelId: string, command: CameraCommand) => {
    const human = humanRefs.current[modelId];
    if (human && readyModelsRef.current[modelId]) {
      sendCameraCommandToHuman(human, command);
    } else {
      pendingCameraRef.current[modelId] = [
        ...(pendingCameraRef.current[modelId] || []),
        command,
      ];
    }
  };

  const applyDefaultCamera = (modelId: string) => {
    const model = getModelDetail(modelId);
    const camera = model?.defaultCamera;
    if (!camera || !camera.position || !camera.target) {
      return;
    }

    queueCameraCommand(modelId, {
      action: 'camera.set',
      params: {
        position: camera.position,
        target: camera.target,
        animate: false,
        duration: 400,
      },
    });
  };

  const parseSceneConfig = (url?: string | null) => {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const sceneId = parsed.searchParams.get('id');
      if (!sceneId) {
        return null;
      }

      const uaid = parsed.searchParams.get('uaid') || parsed.searchParams.get('uaID');
      return { id: sceneId, uaid };
    } catch (error) {
      console.warn('⚠️  Unable to parse BioDigital URL for scene config:', error);
      return null;
    }
  };

  const queueSceneLoad = (modelId: string, sceneId: string, uaid?: string | null) => {
    if (modelId === HEADACHE_MODEL_ID) {
      return;
    }
    const human = humanRefs.current[modelId];
    const payload: Record<string, any> = { id: sceneId };
    if (uaid) {
      payload.uaid = uaid;
    }

    if (human && readyModelsRef.current[modelId]) {
      try {
        try {
          human.scene.load(payload);
        } catch (sceneError) {
          console.warn(`⚠️  scene.load failed for ${sceneId}, trying view.load`, sceneError);
          human.view.load(payload);
        }
      } catch (error) {
        console.warn(`⚠️  Unable to load scene ${sceneId}:`, error);
      }
      pendingSceneRef.current[modelId] = undefined;
    } else {
      pendingSceneRef.current[modelId] = { id: sceneId, uaid: uaid ?? null };
    }
  };

  const flushCameraQueue = (modelId: string) => {
    const queue = pendingCameraRef.current[modelId];
    if (!queue || !queue.length) {
      return;
    }

    const human = humanRefs.current[modelId];
    queue.forEach((command) => sendCameraCommandToHuman(human, command));
    pendingCameraRef.current[modelId] = [];
  };

  const finalizeActivation = (detail: ViewerModelDetail) => {
    if (!detail.modelId) {
      return;
    }

    if (detail.modelId === HEADACHE_MODEL_ID) {
      pendingActivationRef.current = null;
      setActiveModelId(detail.modelId);
      activeModelIdRef.current = detail.modelId;
      return;
    }

    pendingActivationRef.current = null;
    setActiveModelId(detail.modelId);
    activeModelIdRef.current = detail.modelId;
    flushCameraQueue(detail.modelId);
  };

  const ensureHumanForModel = (modelId: string) => {
    if (modelId === HEADACHE_MODEL_ID) {
      return;
    }
    if (!window.HumanAPI || humanRefs.current[modelId]) {
      return;
    }

    const iframeId = getIframeId(modelId);

    try {
      const human = new window.HumanAPI(iframeId);
      humanRefs.current[modelId] = human;

      human.on('human.ready', () => {
        readyModelsRef.current[modelId] = true;
        console.log(`✅ BioDigital viewer ready: ${modelId}`);

        const modelDetail = getModelDetail(modelId);
        const baseSource = modelDetail?.biodigitalUrl || null;

        const pendingScene = pendingSceneRef.current[modelId];
        if (pendingScene) {
          try {
            const payload: Record<string, any> = { id: pendingScene.id };
            if (pendingScene.uaid) {
              payload.uaid = pendingScene.uaid;
            }
            try {
              human.scene.load(payload);
            } catch (sceneError) {
              console.warn(`⚠️  scene.load failed for pending ${pendingScene.id}, trying view.load`, sceneError);
              human.view.load(payload);
            }
          } catch (error) {
            console.warn(`⚠️  Unable to load pending scene ${pendingScene.id}:`, error);
          }
          pendingSceneRef.current[modelId] = undefined;
        } else if (baseSource) {
          const sceneConfig = parseSceneConfig(baseSource);
          if (sceneConfig) {
            try {
              const payload: Record<string, any> = { id: sceneConfig.id };
              if (sceneConfig.uaid) {
                payload.uaid = sceneConfig.uaid;
              }
              try {
                human.scene.load(payload);
              } catch (sceneError) {
                console.warn(`⚠️  scene.load failed for base ${sceneConfig.id}, trying view.load`, sceneError);
                human.view.load(payload);
              }
            } catch (error) {
              console.warn(`⚠️  Unable to warm-load scene ${sceneConfig.id}:`, error);
            }
          }
        }

        const pending = pendingActivationRef.current;
        if (pending && pending.modelId === modelId) {
          finalizeActivation(pending);
        }

        if (!pendingScene) {
          applyDefaultCamera(modelId);
        }

        flushCameraQueue(modelId);
      });

      human.on('human.error', (error: any) => {
        console.error(`❌ BioDigital viewer error (${modelId}):`, error);
      });
    } catch (error) {
      console.error(`❌ Failed to initialize BioDigital viewer (${modelId}):`, error);
    }
  };

  /**
   * Load HumanAPI script once
   */
  useEffect(() => {
    if (window.HumanAPI) {
      scriptLoadedRef.current = true;
      catalog.forEach((model) => ensureHumanForModel(model.modelId));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://developer.biodigital.com/builds/api/human-api-3.0.0.min.js';
    script.async = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      console.log('✅ BioDigital HumanAPI script loaded');
      catalog.forEach((model) => ensureHumanForModel(model.modelId));
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
   * Instantiate viewers whenever new models are announced
   */
  useEffect(() => {
    if (!scriptLoadedRef.current) {
      return;
    }
    catalog.forEach((model) => ensureHumanForModel(model.modelId));
  }, [catalog]);

  useEffect(() => {
    catalog.forEach((model) => {
      if (model.biodigitalUrl) {
        ensurePreloadLink(model.biodigitalUrl);
      }
    });
  }, [catalog]);

  /**
   * Handle camera commands directed at the active model
   */
  useEffect(() => {
    const handleCameraCommand = (event: CustomEvent<CameraCommand>) => {
      const cameraCommand = event.detail;
      const targetModelId = activeModelIdRef.current;

      if (!targetModelId) {
        console.warn('⚠️  No active model to receive camera command');
        return;
      }

      queueCameraCommand(targetModelId, cameraCommand);
    };

    window.addEventListener('biodigital-camera-command' as any, handleCameraCommand);

    return () => {
      window.removeEventListener('biodigital-camera-command' as any, handleCameraCommand);
    };
  }, []);

  /**
   * Receive viewer model updates (show/hide specific scene)
   */
  useEffect(() => {
    const handleModelLoad = (event: CustomEvent<ViewerModelDetail>) => {
      const detail = event.detail || {};

      if (detail.visible === false || !detail.modelId) {
        pendingActivationRef.current = null;
        setHeadacheVideoSrc(null);

        const defaultDetail: ViewerModelDetail = {
          modelId: DEFAULT_MODEL_ID,
          modelName: DEFAULT_MODEL_NAME,
          viewpointId: DEFAULT_VIEW_ID,
          viewpointName: 'Front View',
          camera: DEFAULT_CAMERA,
          reason: DEFAULT_BANNER.reason,
          visible: true,
        };

        updateBanner(defaultDetail);
        setActiveModelId(DEFAULT_MODEL_ID);
        activeModelIdRef.current = DEFAULT_MODEL_ID;

        const defaultScene = parseSceneConfig(DEFAULT_BIODIGITAL_URL);
        if (defaultScene) {
          queueSceneLoad(DEFAULT_MODEL_ID, defaultScene.id, defaultScene.uaid);
        }

        applyDefaultCamera(DEFAULT_MODEL_ID);
        return;
      }

      if (detail.modelId && (detail.biodigitalUrl || detail.viewpointUrl)) {
        const exists = catalogRef.current.some((model) => model.modelId === detail.modelId);
        if (!exists) {
          setCatalog((prev) => [
            ...prev,
            {
              modelId: detail.modelId!,
              modelName: detail.modelName || detail.modelId!,
              biodigitalUrl: detail.biodigitalUrl || detail.viewpointUrl || DEFAULT_BIODIGITAL_URL,
            },
          ]);
        } else if (detail.biodigitalUrl && !getModelDetail(detail.modelId)?.biodigitalUrl) {
          setCatalog((prev) => prev.map((model) =>
            model.modelId === detail.modelId ? { ...model, biodigitalUrl: detail.biodigitalUrl! } : model,
          ));
        }
      }

      if (detail.modelId === HEADACHE_MODEL_ID) {
        const nextVideoSrc = resolveHeadacheVideoSrc(detail.viewpointId);
        setHeadacheVideoSrc(nextVideoSrc);
        setHeadacheVideoKey((prev) => prev + 1);
        updateBanner(detail);
        pendingActivationRef.current = null;
        setActiveModelId(HEADACHE_MODEL_ID);
        activeModelIdRef.current = HEADACHE_MODEL_ID;
        return;
      }

      setHeadacheVideoSrc(null);

      if (detail.viewpointUrl) {
        ensurePreloadLink(detail.viewpointUrl);
      }

      const modelInfo = getModelDetail(detail.modelId!);
      const preferredUrl = detail.viewpointUrl || detail.biodigitalUrl || modelInfo?.biodigitalUrl;
      const sceneConfig = parseSceneConfig(preferredUrl);
      if (sceneConfig) {
        queueSceneLoad(detail.modelId!, sceneConfig.id, sceneConfig.uaid);
      }

      updateBanner(detail);
      pendingActivationRef.current = detail;
      setActiveModelId(detail.modelId);
      activeModelIdRef.current = detail.modelId;

      if (detail.camera && detail.camera.position && detail.camera.target && detail.modelId) {
        queueCameraCommand(detail.modelId, {
          action: 'camera.set',
          params: {
            position: detail.camera.position,
            target: detail.camera.target,
            animate: false,
            duration: 500,
          },
        });
      } else if (detail.modelId) {
        applyDefaultCamera(detail.modelId);
      }

      if (detail.modelId && readyModelsRef.current[detail.modelId]) {
        finalizeActivation(detail);
      }
    };

    window.addEventListener('biodigital-load-model' as any, handleModelLoad);

    return () => {
      window.removeEventListener('biodigital-load-model' as any, handleModelLoad);
    };
  }, []);

  /**
   * Receive catalog announcements and preload all models
   */
  useEffect(() => {
    const handleCatalog = (event: CustomEvent<ViewerCatalogPayload>) => {
      const payload = event.detail;
      if (!payload || !Array.isArray(payload.models)) {
        return;
      }

      const deduped = payload.models.filter((model) => model && model.modelId && model.biodigitalUrl);
      if (!deduped.length) {
        return;
      }

      const unique = deduped.reduce<ViewerCatalogPayload['models']>((acc, model) => {
        if (!acc.find((item) => item.modelId === model.modelId)) {
          acc.push(model);
        }
        return acc;
      }, []);

      setCatalog(unique);
    };

    window.addEventListener('biodigital-catalog' as any, handleCatalog);

    return () => {
      window.removeEventListener('biodigital-catalog' as any, handleCatalog);
    };
  }, []);

  return (
    <div className="biodigital-viewer-wrapper">
      <div className="biodigital-viewer-frame">
        <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg max-w-sm">
          <p className="text-sm font-semibold text-gray-800">{bannerInfo.modelName}</p>
          <p className="text-xs text-gray-600 mt-1">View: {bannerInfo.viewpointName}</p>
          <p className="text-xs text-gray-500 mt-1">{bannerInfo.reason}</p>
          {bannerInfo.autoSelected && (
            <p className="text-[11px] text-emerald-600 mt-1">Auto-matched from conversation</p>
          )}
        </div>

        {activeModelId === HEADACHE_MODEL_ID && headacheVideoSrc && (
          <video
            key={`${headacheVideoKey}-${headacheVideoSrc}`}
            src={headacheVideoSrc}
            autoPlay
            loop
            muted
            playsInline
            className="biodigital-layer biodigital-video"
            style={{ zIndex: 20 }}
          />
        )}

        {catalog.map((model) => {
          const iframeId = getIframeId(model.modelId);
          const isActive = activeModelId === model.modelId;
          const disableIframe = model.modelId === HEADACHE_MODEL_ID;
          return (
            <iframe
              key={model.modelId}
              id={iframeId}
              src={model.biodigitalUrl}
              loading="eager"
              className="biodigital-layer transition-opacity duration-500"
              style={{
                opacity: isActive && !disableIframe ? 1 : 0,
                visibility: isActive && !disableIframe ? 'visible' : 'hidden',
                pointerEvents: isActive && !disableIframe ? 'auto' : 'none',
                zIndex: isActive && !disableIframe ? 20 : 10,
              }}
              allow="xr-spatial-tracking"
              title={`3D Anatomy Viewer - ${model.modelName}`}
            />
          );
        })}

        {catalog.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-2xl">
            <p className="text-sm text-gray-500">Loading anatomy models…</p>
          </div>
        )}
      </div>
    </div>
  );
}
