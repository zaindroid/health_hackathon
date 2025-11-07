/**
 * Anatomy Navigator - 3D Camera Navigation Tool
 * Provides tool calls for navigating the BioDigital 3D anatomy viewer
 * by looking up camera coordinates from the database
 */

import * as fs from 'fs';
import * as path from 'path';

const HEADACHE_MODEL_ID = 'headache_types_cranial_pain';
const SKELETAL_MODEL_ID = 'skeletal_system';
const SKELETAL_HEAD_VIEWPOINT_ID = 'head';
const HEADACHE_CONTEXT_TO_VIEWPOINT: Record<string, string> = {
  sinus: 'sinus_headache',
  tension: 'tension_headache',
  migraine: 'migraine_headache',
  cluster: 'cluster_headache',
};
const GENERIC_HEADACHE_TOKENS = new Set(['pain', 'pressure', 'ache', 'aches', 'hurt', 'hurts', 'hurting', 'painful', 'head', 'headache', 'headaches', 'eye']);

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
  camera?: CameraPosition;
  biodigitalUrl?: string;
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
  aiContext?: {
    topics?: string[];
    default_view?: string;
    viewContexts?: Record<string, string[]>;
  };
}

export interface AnatomyDatabase {
  models: AnatomyModel[];
  metadata?: any;
}

interface QueryAnalysis {
  original: string;
  tokens: Set<string>;
  phrases: Set<string>;
}

export interface AnatomyMatchResult {
  modelId: string;
  modelName: string;
  viewpointId: string;
  viewpointName: string;
  biodigitalUrl: string;
  viewpointUrl?: string;
  viewpointCamera?: CameraPosition;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

export class AnatomyNavigator {
  private data: AnatomyDatabase;
  private currentModelId: string = SKELETAL_MODEL_ID;

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

    if (!viewpoint.camera) {
      console.error(`[-] Viewpoint '${viewpointId}' in model ${modelId} is missing camera data.`);
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

  /**
   * Public helpers to access full model/viewpoint definitions
   */
  getModelInfo(modelId: string): AnatomyModel | null {
    return this.getModelById(modelId);
  }

  getViewpointInfo(modelId: string, viewpointId: string): Viewpoint | null {
    const model = this.getModelById(modelId);
    if (!model) {
      return null;
    }
    return model.viewpoints.find((vp) => vp.id === viewpointId) || null;
  }

  getModelCatalog(): Array<{
    modelId: string;
    modelName: string;
    biodigitalUrl: string;
    defaultViewId?: string;
    defaultCamera?: CameraPosition;
  }> {
    return this.data.models.map((model) => {
      const defaultViewId = model.aiContext?.default_view || model.viewpoints[0]?.id;
      const defaultView = defaultViewId ? model.viewpoints.find((view) => view.id === defaultViewId) : undefined;

      return {
        modelId: model.id,
        modelName: model.name,
        biodigitalUrl: model.biodigitalUrl,
        defaultViewId,
        defaultCamera: defaultView?.camera,
      };
    });
  }

  getDefaultMatch(): AnatomyMatchResult | null {
    const model = this.getModelById(SKELETAL_MODEL_ID);
    if (!model) {
      return null;
    }

    const defaultViewId = this.getDefaultViewId(model);
    if (!defaultViewId) {
      return null;
    }

    const viewpoint = this.getViewpointInfo(model.id, defaultViewId);
    if (!viewpoint) {
      return null;
    }

    return {
      modelId: model.id,
      modelName: model.name,
      viewpointId: viewpoint.id,
      viewpointName: viewpoint.name,
      biodigitalUrl: model.biodigitalUrl,
      viewpointUrl: viewpoint.biodigitalUrl,
      viewpointCamera: viewpoint.camera,
      score: 90,
      matchedKeywords: ['default'],
      reason: `Default view for ${model.name}.`,
    };
  }

  /**
   * Suggest the most relevant model/viewpoint pairing for a natural language query
   */
  suggestViewForQuery(query: string): AnatomyMatchResult | null {
    const cleaned = query?.trim();
    if (!cleaned) {
      return null;
    }

    const analysis = this.analyzeQuery(cleaned);

    const headacheIntent = this.resolveHeadacheIntent(analysis);
    if (headacheIntent) {
      return headacheIntent;
    }

    let best: AnatomyMatchResult | null = null;

    for (const model of this.data.models) {
      const modelMatches: string[] = [];
      let modelScore = 0;

      if (model.aiContext?.topics?.length) {
        modelScore += this.scoreList(analysis, model.aiContext.topics, 4, modelMatches);
      }

      modelScore += this.scoreText(analysis, model.name, 2, modelMatches);
      modelScore += this.scoreText(analysis, model.description, 1, modelMatches);
      modelScore += this.scoreIdentifier(analysis, model.id, 3, modelMatches);

      for (const viewpoint of model.viewpoints) {
        const viewMatches = [...modelMatches];
        let viewScore = modelScore;

        if (model.aiContext?.viewContexts) {
          const contexts = model.aiContext.viewContexts[viewpoint.id];
          if (contexts?.length) {
            viewScore += this.scoreList(analysis, contexts, 6, viewMatches);
          }
        }

        viewScore += this.scoreText(analysis, viewpoint.name, 4, viewMatches);
        viewScore += this.scoreText(analysis, viewpoint.description, 2, viewMatches);
        viewScore += this.scoreText(analysis, viewpoint.buttonLabel, 2.5, viewMatches);
        viewScore += this.scoreIdentifier(analysis, viewpoint.id, 2.5, viewMatches);

        if (viewpoint.clinicalContext) {
          viewScore += this.scoreText(analysis, viewpoint.clinicalContext, 2, viewMatches);
        }

        if (viewpoint.commonUseCases?.length) {
          viewScore += this.scoreList(analysis, viewpoint.commonUseCases, 1.5, viewMatches);
        }

        if (viewpoint.anatomyVisible) {
          const flattened = this.flattenRecordValues(viewpoint.anatomyVisible);
          viewScore += this.scoreList(analysis, flattened, 1.5, viewMatches);
        }

        viewScore += this.directionalBoost(analysis, viewpoint.id, viewMatches);

        if (!best || viewScore > best.score) {
          best = {
            modelId: model.id,
            modelName: model.name,
            viewpointId: viewpoint.id,
            viewpointName: viewpoint.name,
            biodigitalUrl: model.biodigitalUrl,
            viewpointUrl: viewpoint.biodigitalUrl,
            viewpointCamera: viewpoint.camera,
            score: viewScore,
            matchedKeywords: Array.from(new Set(viewMatches)),
            reason: this.buildReason(viewMatches, model.name, viewpoint.name),
          };
        }
      }
    }

    if (best && best.score < 3) {
      return null;
    }

    return best;
  }

  private resolveHeadacheIntent(analysis: QueryAnalysis): AnatomyMatchResult | null {
    const specific = this.detectSpecificHeadacheIntent(analysis);
    if (specific) {
      return this.buildSpecificHeadacheMatch(specific.viewpointId, specific.matchedKeywords);
    }

    const general = this.detectGeneralHeadacheIntent(analysis);
    if (general) {
      return this.buildGeneralHeadacheMatch(general);
    }

    return null;
  }

  private detectSpecificHeadacheIntent(analysis: QueryAnalysis): { viewpointId: string; matchedKeywords: string[] } | null {
    const model = this.getModelById(HEADACHE_MODEL_ID);
    const viewContexts = model?.aiContext?.viewContexts;
    if (!model || !viewContexts) {
      return null;
    }

    let bestMatch: { viewpointId: string; matchedKeywords: string[]; score: number } | null = null;

    for (const [contextKey, phrases] of Object.entries(viewContexts)) {
      const viewpointId = HEADACHE_CONTEXT_TO_VIEWPOINT[contextKey];
      if (!viewpointId) {
        continue;
      }

      const { tokenSet, phraseSet } = this.expandHeadacheKeywords(contextKey, phrases);
      let score = 0;
      const matched = new Set<string>();

      tokenSet.forEach((token) => {
        if (analysis.tokens.has(token)) {
          matched.add(token);
          score += 1;
        }
      });

      phraseSet.forEach((phrase) => {
        if (analysis.phrases.has(phrase)) {
          matched.add(phrase);
          score += 2;
        }
      });

      if (score > 0) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            viewpointId,
            matchedKeywords: Array.from(matched),
            score,
          };
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    return {
      viewpointId: bestMatch.viewpointId,
      matchedKeywords: bestMatch.matchedKeywords,
    };
  }

  private detectGeneralHeadacheIntent(analysis: QueryAnalysis): string[] | null {
    const matched = new Set<string>();
    const generalTokens = ['headache', 'headaches', 'headachey'];
    const generalPhrases = ['head pain', 'head hurts', 'pain in head', 'my head hurts', 'head is hurting', 'hurting head', 'pounding head', 'head pressure'];

    generalTokens.forEach((term) => {
      const normalized = this.normalize(term);
      if (analysis.tokens.has(normalized)) {
        matched.add(term);
      }
    });

    generalPhrases.forEach((phrase) => {
      const normalized = this.normalize(phrase);
      if (analysis.phrases.has(normalized)) {
        matched.add(phrase);
      }
    });

    const headMentioned = analysis.tokens.has('head');
    const painIndicators = ['pain', 'ache', 'aches', 'hurt', 'hurts', 'hurting', 'pounding', 'pressure'];
    const hasPainIndicator = painIndicators.some((indicator) => analysis.tokens.has(indicator));
    if (headMentioned && hasPainIndicator) {
      matched.add('head pain');
    }

    if (!matched.size) {
      return null;
    }

    return Array.from(matched);
  }

  private expandHeadacheKeywords(contextKey: string, phrases: string[]): { tokenSet: Set<string>; phraseSet: Set<string> } {
    const tokenSet = new Set<string>();
    const phraseSet = new Set<string>();

    const addPhrase = (phrase: string) => {
      const normalized = this.normalize(phrase);
      if (!normalized) {
        return;
      }
      phraseSet.add(normalized);
      normalized.split(' ').forEach((part) => {
        if (part && !GENERIC_HEADACHE_TOKENS.has(part)) {
          tokenSet.add(part);
        }
      });
    };

    addPhrase(contextKey);
    phrases.forEach(addPhrase);

    return { tokenSet, phraseSet };
  }

  private buildSpecificHeadacheMatch(viewpointId: string, matchedKeywords: string[]): AnatomyMatchResult | null {
    const model = this.getModelById(HEADACHE_MODEL_ID);
    const viewpoint = this.getViewpointInfo(HEADACHE_MODEL_ID, viewpointId);
    if (!model || !viewpoint) {
      return null;
    }

    return {
      modelId: model.id,
      modelName: model.name,
      viewpointId: viewpoint.id,
      viewpointName: viewpoint.name,
      biodigitalUrl: model.biodigitalUrl,
      viewpointUrl: viewpoint.biodigitalUrl,
      viewpointCamera: viewpoint.camera,
      score: 120,
      matchedKeywords: matchedKeywords.length ? matchedKeywords : [viewpoint.name],
      reason: `Showing ${viewpoint.name} pain pattern to match the described symptoms.`,
    };
  }

  private buildGeneralHeadacheMatch(matchedKeywords: string[]): AnatomyMatchResult | null {
    const model = this.getModelById(SKELETAL_MODEL_ID);
    const viewpoint = this.getViewpointInfo(SKELETAL_MODEL_ID, SKELETAL_HEAD_VIEWPOINT_ID);
    if (!model || !viewpoint) {
      return null;
    }

    const keywords = matchedKeywords.length ? matchedKeywords : ['headache'];

    return {
      modelId: model.id,
      modelName: model.name,
      viewpointId: viewpoint.id,
      viewpointName: viewpoint.name,
      biodigitalUrl: model.biodigitalUrl,
      viewpointUrl: viewpoint.biodigitalUrl,
      viewpointCamera: viewpoint.camera,
      score: 110,
      matchedKeywords: keywords,
      reason: 'Centered on the skull to ground the headache discussion.',
    };
  }

  private analyzeQuery(query: string): QueryAnalysis {
    const normalized = this.normalize(query);
    const rawTokens = normalized.split(' ').filter(Boolean);

    const tokens = new Set<string>(rawTokens);
    const phrases = new Set<string>(rawTokens);

    for (let size = 2; size <= 3; size++) {
      for (let i = 0; i <= rawTokens.length - size; i++) {
        const phrase = rawTokens.slice(i, i + size).join(' ');
        phrases.add(phrase);
      }
    }

    return {
      original: query,
      tokens,
      phrases,
    };
  }

  private scoreList(analysis: QueryAnalysis, values: string[], weight: number, matches: string[]): number {
    let score = 0;
    for (const value of values) {
      score += this.scoreText(analysis, value, weight, matches);
    }
    return score;
  }

  private scoreText(analysis: QueryAnalysis, text: string | undefined, weight: number, matches: string[]): number {
    if (!text) {
      return 0;
    }

    const normalized = this.normalize(text);
    let score = 0;

    for (const phrase of analysis.phrases) {
      if (phrase.length < 3) {
        continue;
      }
      if (normalized.includes(phrase)) {
        score += weight;
        matches.push(text.trim());
        break;
      }
    }

    return score;
  }

  private scoreIdentifier(analysis: QueryAnalysis, identifier: string | undefined, weight: number, matches: string[]): number {
    if (!identifier) {
      return 0;
    }

    const formatted = identifier.replace(/[_-]+/g, ' ');
    return this.scoreText(analysis, formatted, weight, matches);
  }

  private directionalBoost(analysis: QueryAnalysis, viewpointId: string, matches: string[]): number {
    let boost = 0;

    if (analysis.tokens.has('right') && viewpointId.includes('right')) {
      boost += 3;
      matches.push('right side');
    }

    if (analysis.tokens.has('left') && viewpointId.includes('left')) {
      boost += 3;
      matches.push('left side');
    }

    if ((analysis.tokens.has('front') || analysis.tokens.has('anterior')) && viewpointId.includes('front')) {
      boost += 2;
      matches.push('front/anterior');
    }

    if ((analysis.tokens.has('back') || analysis.tokens.has('posterior')) && viewpointId.includes('back')) {
      boost += 2;
      matches.push('back/posterior');
    }

    if (analysis.tokens.has('neck') && viewpointId.includes('neck')) {
      boost += 1.5;
      matches.push('neck');
    }

    return boost;
  }

  private getDefaultViewId(model: AnatomyModel): string | null {
    const candidate = model.aiContext?.default_view;
    if (candidate && model.viewpoints.some((view) => view.id === candidate)) {
      return candidate;
    }

    return model.viewpoints[0]?.id ?? null;
  }

  private flattenRecordValues(record: Record<string, any>): string[] {
    const values: string[] = [];
    for (const key of Object.keys(record)) {
      const entry = record[key];
      if (Array.isArray(entry)) {
        values.push(...entry.map((item) => String(item)));
      } else if (entry && typeof entry === 'object') {
        values.push(...this.flattenRecordValues(entry));
      } else if (entry) {
        values.push(String(entry));
      }
    }
    return values;
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private buildReason(matches: string[], modelName: string, viewpointName: string): string {
    if (!matches.length) {
      return `Selected ${viewpointName} in ${modelName}.`;
    }

    const highlights = matches.slice(0, 3).map((item) => item.toLowerCase());
    return `Matched ${highlights.join(', ')} → ${viewpointName} (${modelName}).`;
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
