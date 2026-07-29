import type { ReactNode } from 'react';
import type { WorkflowStageId } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';

interface WorkflowArtifactPreviewProps {
  language: Language;
  stage: WorkflowStageId;
  artifact: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function EmptyPreview({ language }: { language: Language }) {
  return <p className="workflow-empty">{t(language, 'workflow.preview.empty')}</p>;
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="workflow-preview-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function textSection(title: string, value: unknown): ReactNode {
  const content = text(value);
  return content ? <PreviewSection title={title}><p>{content}</p></PreviewSection> : null;
}

function renderIntake(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact)) return <EmptyPreview language={language} />;
  const fields = [
    ['Genre', artifact.genre],
    ['World premise', artifact.worldPremise],
    ['Protagonist', artifact.protagonist],
    ['Core conflict', artifact.coreConflict],
    ['Reader feeling', artifact.readerFeeling],
    ['Target length', artifact.targetLength]
  ] as const;
  const visibleFields = fields.filter(([, value]) => text(value));
  if (visibleFields.length === 0) return <EmptyPreview language={language} />;

  return (
    <div className="workflow-preview-grid">
      {visibleFields.map(([label, value]) => (
        <PreviewSection key={label} title={label}><p>{text(value)}</p></PreviewSection>
      ))}
      {Array.isArray(artifact.requiredElements) && artifact.requiredElements.some((item) => text(item)) ? (
        <PreviewSection title="Required elements">
          <ul>{artifact.requiredElements.map((item, index) => text(item) ? <li key={index}>{text(item)}</li> : null)}</ul>
        </PreviewSection>
      ) : null}
    </div>
  );
}

function renderWorldOutline(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact) || !text(artifact.worldDocument) || !text(artifact.masterOutline)) {
    return <EmptyPreview language={language} />;
  }
  return (
    <div className="workflow-preview-stack">
      {textSection(t(language, 'workflow.preview.worldDocument'), artifact.worldDocument)}
      {textSection(t(language, 'workflow.preview.masterOutline'), artifact.masterOutline)}
    </div>
  );
}

function renderCharacterBible(language: Language, artifact: unknown): ReactNode {
  if (!Array.isArray(artifact)) return <EmptyPreview language={language} />;
  const characters = artifact.filter((item) => isRecord(item) && text(item.name));
  if (characters.length === 0) return <EmptyPreview language={language} />;

  return (
    <PreviewSection title={t(language, 'workflow.preview.characters')}>
      <div className="workflow-preview-cards">
        {characters.map((character, index) => isRecord(character) ? (
          <article key={text(character.id) ?? `${text(character.name)}-${index}`} className="workflow-preview-card">
            <h5>{text(character.name)}</h5>
            {text(character.role) ? <p><strong>{text(character.role)}</strong></p> : null}
            {text(character.motivation) ? <p>{text(character.motivation)}</p> : null}
            {text(character.flaw) ? <p>{text(character.flaw)}</p> : null}
            {text(character.arc) ? <p>{text(character.arc)}</p> : null}
          </article>
        ) : null)}
      </div>
    </PreviewSection>
  );
}

function renderActTimeline(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact) || !Array.isArray(artifact.acts)) return <EmptyPreview language={language} />;
  const acts = artifact.acts.filter((act) => isRecord(act) && (text(act.title) || text(act.summary)));
  if (acts.length === 0) return <EmptyPreview language={language} />;

  return (
    <PreviewSection title={t(language, 'workflow.preview.timeline')}>
      <div className="workflow-preview-cards">
        {acts.map((act, index) => isRecord(act) ? (
          <article key={text(act.id) ?? index} className="workflow-preview-card">
            <h5>{text(act.title) ?? `Act ${index + 1}`}</h5>
            {[act.time, act.location, act.movement, act.summary].map((value, valueIndex) =>
              text(value) ? <p key={valueIndex}>{text(value)}</p> : null
            )}
          </article>
        ) : null)}
      </div>
    </PreviewSection>
  );
}

function renderSceneOutline(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact) || !Array.isArray(artifact.acts)) return <EmptyPreview language={language} />;
  const acts = artifact.acts.filter((act) => isRecord(act) && Array.isArray(act.chapters));
  if (acts.length === 0) return <EmptyPreview language={language} />;

  return (
    <PreviewSection title={t(language, 'workflow.preview.scenes')}>
      <div className="workflow-preview-stack">
        {acts.map((act, actIndex) => isRecord(act) ? (
          <article key={text(act.actId) ?? actIndex} className="workflow-preview-card">
            <h5>{text(act.actId) ?? `Act ${actIndex + 1}`}</h5>
            {text(act.summary) ? <p>{text(act.summary)}</p> : null}
            {Array.isArray(act.chapters) ? act.chapters.map((chapter, chapterIndex) => isRecord(chapter) ? (
              <div key={text(chapter.id) ?? chapterIndex} className="workflow-preview-nested">
                <strong>{`Chapter ${numberValue(chapter.chapterId) ?? chapterIndex + 1}`}</strong>
                {text(chapter.target) ? <p>{text(chapter.target)}</p> : null}
                {Array.isArray(chapter.scenes) ? (
                  <ul>{chapter.scenes.map((scene, sceneIndex) => isRecord(scene) && text(scene.summary) ? <li key={text(scene.id) ?? sceneIndex}>{text(scene.summary)}</li> : null)}</ul>
                ) : null}
              </div>
            ) : null) : null}
          </article>
        ) : null)}
      </div>
    </PreviewSection>
  );
}

function renderReview(language: Language, review: unknown): ReactNode {
  if (!isRecord(review) || !text(review.summary)) return null;
  return (
    <PreviewSection title={t(language, 'workflow.preview.review')}>
      <p>{text(review.summary)}</p>
      {Array.isArray(review.issues) && review.issues.length > 0 ? (
        <ul className="workflow-review-issues">
          {review.issues.map((issue, index) => isRecord(issue) && text(issue.message) ? (
            <li key={text(issue.id) ?? index}>{text(issue.message)}</li>
          ) : null)}
        </ul>
      ) : null}
    </PreviewSection>
  );
}

function renderChapterDraft(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact)) return <EmptyPreview language={language} />;

  if (isRecord(artifact.chapter)) {
    const meta = isRecord(artifact.chapter.meta) ? artifact.chapter.meta : null;
    const content = text(artifact.chapter.content);
    const review = renderReview(language, artifact.review);
    if (!meta && !content && !review) return <EmptyPreview language={language} />;
    return (
      <div className="workflow-preview-stack">
        <PreviewSection title={t(language, 'workflow.preview.chapter')}>
          {meta && text(meta.title) ? <h5>{text(meta.title)}</h5> : null}
          {content ? <p className="workflow-chapter-excerpt">{content}</p> : null}
        </PreviewSection>
        {review}
      </div>
    );
  }

  const reviews = Object.entries(artifact).filter(([, review]) => isRecord(review) && text(review.summary));
  if (reviews.length === 0) return <EmptyPreview language={language} />;
  return (
    <PreviewSection title={t(language, 'workflow.preview.review')}>
      <div className="workflow-preview-cards">
        {reviews.map(([chapterId, review]) => isRecord(review) ? (
          <article key={chapterId} className="workflow-preview-card">
            <h5>{`Chapter ${chapterId}`}</h5>
            <p>{text(review.summary)}</p>
          </article>
        ) : null)}
      </div>
    </PreviewSection>
  );
}

function renderActScore(language: Language, artifact: unknown): ReactNode {
  if (!isRecord(artifact)) return <EmptyPreview language={language} />;
  const score = text(artifact.actId) ? artifact : Object.values(artifact).find((value) => isRecord(value));
  if (!isRecord(score)) return <EmptyPreview language={language} />;
  const dimensions = [
    ['Plot continuity', score.plotContinuity],
    ['Character consistency', score.characterConsistency],
    ['Pacing control', score.pacingControl],
    ['Detail richness', score.detailRichness]
  ] as const;
  if (!dimensions.some(([, value]) => numberValue(value) !== null) && !text(score.comment)) {
    return <EmptyPreview language={language} />;
  }
  return (
    <PreviewSection title={t(language, 'workflow.preview.score')}>
      <div className="workflow-score-grid">
        {dimensions.map(([label, value]) => numberValue(value) !== null ? <div key={label}><strong>{numberValue(value)}</strong><span>{label}</span></div> : null)}
      </div>
      {text(score.comment) ? <p>{text(score.comment)}</p> : null}
    </PreviewSection>
  );
}

function renderFullReview(language: Language, artifact: unknown): ReactNode {
  return renderReview(language, artifact) ?? <EmptyPreview language={language} />;
}

export function WorkflowArtifactPreview({ language, stage, artifact }: WorkflowArtifactPreviewProps) {
  switch (stage) {
    case 'intake':
      return renderIntake(language, artifact);
    case 'world_outline':
      return renderWorldOutline(language, artifact);
    case 'character_bible':
      return renderCharacterBible(language, artifact);
    case 'act_timeline':
      return renderActTimeline(language, artifact);
    case 'scene_outline':
      return renderSceneOutline(language, artifact);
    case 'chapter_draft':
      return renderChapterDraft(language, artifact);
    case 'act_scoring':
      return renderActScore(language, artifact);
    case 'full_review':
      return renderFullReview(language, artifact);
  }
}
