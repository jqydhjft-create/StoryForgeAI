export type TreeNodeKind = 'world' | 'character' | 'plot' | 'chapter' | 'export' | 'summary';

export interface StoryConcept {
  title: string;
  protagonist: string;
  goal: string;
  conflict: string;
  themes: string[];
}

export interface WorldBible {
  genre: string;
  premise: string;
  rules: string[];
  terms: Record<string, string>;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  motivation: string;
  flaw: string;
  arc: string;
}

export interface PlotBeat {
  id: string;
  label: string;
  summary: string;
  chapterHint: number;
}

export interface ChapterMeta {
  id: number;
  title: string;
  sceneCount: number;
  characters: string[];
  locations: string[];
  timelineDay: number;
}

export interface ProjectSettings {
  name: string;
  createdAt: string;
  reviewStrictness: 'low' | 'medium' | 'high';
}

export interface SummaryData {
  timeline: Array<{ event: string; time: string; chapter: number }>;
  locations: Array<{ name: string; firstAppearance: string; scenes: string[] }>;
  characters: Array<{ name: string; firstChapter: number; lastChapter: number; statusChange: string }>;
}

export interface StoryProject {
  rootPath: string;
  settings: ProjectSettings;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
  chapters: Array<{ meta: ChapterMeta; content: string }>;
  summary: SummaryData;
}

export interface ProjectFileWrite {
  relativePath: string;
  content: string;
}

export type StorySkillId =
  | 'theme-generator'
  | 'world-generator'
  | 'character-generator'
  | 'plot-designer'
  | 'scene-writing-workshop'
  | 'theme-review'
  | 'character-review'
  | 'plot-review'
  | 'world-review'
  | 'logic-detective'
  | 'integrated-gate'
  | 'summary-ai'
  | 'next-chapter-workshop';

export interface StorySkillRequest {
  skillId: StorySkillId;
  systemPrompt: string;
  userPrompt: string;
  schemaHint: string;
  outputSchema: string;
  repairPrompt: string;
  exampleInput: string;
  exampleOutput: string;
}

export interface StorySkillResponse {
  skillId: StorySkillId;
  provider: 'openai' | 'deepseek' | 'mock';
  output: unknown;
}

export interface AiProviderStatus {
  configured: boolean;
  provider: 'openai' | 'deepseek' | 'mock';
  model: string;
  baseUrl: string;
}

export interface AiConnectionTestResult {
  ok: boolean;
  provider: 'openai' | 'deepseek' | 'mock';
  model: string;
  message: string;
}

export interface AiProviderConfigInput {
  provider: 'openai' | 'deepseek';
  apiKey: string;
  model: string;
  baseUrl: string;
}

export type WorkflowStageId =
  | 'intake'
  | 'world_outline'
  | 'act_timeline'
  | 'scene_outline'
  | 'chapter_draft'
  | 'act_scoring'
  | 'full_review';

export type WorkflowStageStatus = 'locked' | 'draft' | 'confirmed' | 'regenerating' | 'optional';

export interface WorkflowStageState {
  status: WorkflowStageStatus;
  confirmedAt?: string;
  regeneratedAt?: string;
}

export interface InitialSettingBook {
  genre: string;
  worldPremise: string;
  protagonist: string;
  coreConflict: string;
  readerFeeling: string;
  targetLength: string;
  requiredElements: string[];
}

export interface WorldOutlineArtifact {
  worldDocument: string;
  masterOutline: string;
}

export interface ActTimelineItem {
  id: string;
  title: string;
  time: string;
  location: string;
  characters: string[];
  movement: string;
  summary: string;
}

export interface ActTimeline {
  acts: ActTimelineItem[];
}

export interface StoryAnchor {
  id: string;
  text: string;
  actId: string;
  chapterId?: number;
}

export interface SceneOutlineItem {
  id: string;
  actId: string;
  chapterId: number;
  target: string;
  scenes: Array<{ id: string; summary: string; characters: string[]; location: string }>;
  anchors: StoryAnchor[];
}

export interface SceneOutlineArtifact {
  acts: Array<{ actId: string; summary: string; chapters: SceneOutlineItem[] }>;
}

export interface CharacterState {
  name: string;
  role: string;
  status: string;
}

export interface ForeshadowingItem {
  id: string;
  text: string;
  status: 'open' | 'echoed' | 'resolved';
}

export interface StoryStateMachine {
  characterStates: CharacterState[];
  foreshadowing: ForeshadowingItem[];
  locationStates?: Array<{ name: string; status: string }>;
  objectStates?: Array<{ name: string; status: string }>;
  activeWorldRules?: string[];
  openConflicts?: string[];
}

export interface StoryMemoryState extends StoryStateMachine {
  recentEvents: Array<{ chapterId: number; summary: string }>;
  workingMemory: string[];
}

export interface MatchedHistoryFragment {
  source: string;
  text: string;
}

export interface ChapterContextPacket {
  currentChapterTarget: string;
  currentActOutline: ActTimelineItem;
  anchors: StoryAnchor[];
  stateMachine: StoryStateMachine;
  previousActSummary: string;
  currentActSummary: string;
  recentChapterTexts: Array<{ id: number; title: string; content: string }>;
  matchedHistoryFragments: MatchedHistoryFragment[];
}

export interface ChapterReviewIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  location?: string;
}

export interface ChapterReviewReport {
  status: 'passed' | 'issues_found';
  summary: string;
  issues: ChapterReviewIssue[];
}

export interface ActScoreReport {
  actId: string;
  plotContinuity: number;
  characterConsistency: number;
  pacingControl: number;
  detailRichness: number;
  comment: string;
}

export interface StoryWorkflowArtifacts {
  initialSettingBook?: InitialSettingBook;
  worldOutline?: WorldOutlineArtifact;
  actTimeline?: ActTimeline;
  sceneOutline?: SceneOutlineArtifact;
  chapterReviews?: Record<number, ChapterReviewReport>;
  actScores?: Record<string, ActScoreReport>;
  fullReview?: ChapterReviewReport;
}

export interface StoryWorkflowState {
  currentStage: WorkflowStageId;
  stages: Record<WorkflowStageId, WorkflowStageState>;
  artifacts: StoryWorkflowArtifacts;
  memory: StoryMemoryState;
}

export type StoryPluginCapability =
  | 'generate_initial_brief'
  | 'generate_world_and_outline'
  | 'generate_act_timeline'
  | 'generate_scene_outline'
  | 'write_chapter'
  | 'review_chapter'
  | 'score_act'
  | 'review_full_text'
  | 'lookup_history'
  | 'check_hard_rules'
  | 'mark_inconsistency'
  | 'update_state_machine';
