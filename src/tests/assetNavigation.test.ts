import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryProject } from '../shared/types';
import { AssetContextList, AssetContextListContent } from '../renderer/components/AssetContextList';
import { AssetTypeRail } from '../renderer/components/AssetTypeRail';

function projectFixture(): StoryProject {
  return {
    rootPath: 'D:/Writer/fixture',
    settings: { name: 'Fixture', createdAt: '2026-07-28T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Fantasy', premise: 'A rainy kingdom', rules: [], terms: {} },
    characters: [
      { id: 'mira', name: 'Mira Rain', role: 'Lead', motivation: '', flaw: '', arc: '' },
      { id: 'orin', name: 'Orin', role: 'Guide', motivation: '', flaw: '', arc: '' }
    ],
    plot: [],
    chapters: [
      { meta: { id: 10, title: 'After the Rain', sceneCount: 1, characters: [], locations: [], timelineDay: 10 }, content: '' },
      { meta: { id: 2, title: 'Rainfall', sceneCount: 1, characters: [], locations: [], timelineDay: 2 }, content: '' },
      { meta: { id: 1, title: 'Arrival', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '' }
    ],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

function childElements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(childElements);
  if (!isValidElement(node)) return [];
  return [node, ...childElements((node.props as { children?: ReactNode }).children)];
}

describe('asset navigation', () => {
  it('renders six accessible asset type buttons with visible labels', () => {
    const html = renderToStaticMarkup(createElement(AssetTypeRail, {
      language: 'en',
      assetType: 'world',
      onChange: vi.fn()
    }));

    for (const [type, label] of [
      ['world', 'World'],
      ['characters', 'Characters'],
      ['acts', 'Acts'],
      ['chapters', 'Chapters'],
      ['summary', 'Summary'],
      ['export', 'Export']
    ]) {
      expect(html).toContain(`data-asset-type="${type}"`);
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toContain('role="navigation"');
    expect(html).toContain('aria-label="Asset types"');
  });

  it('marks the selected asset type and changes only through its callback', () => {
    const onChange = vi.fn();
    const tree = AssetTypeRail({ language: 'en', assetType: 'chapters', onChange });
    const buttons = childElements(tree).filter((element) => element.type === 'button');
    const selected = buttons.find((button) => button.props['data-asset-type'] === 'chapters');
    const summary = buttons.find((button) => button.props['data-asset-type'] === 'summary');

    expect(selected?.props['aria-current']).toBe('page');
    summary?.props.onClick();
    expect(onChange).toHaveBeenCalledWith('summary');
  });

  it('consumes the central Chinese workspace navigation copy', () => {
    const html = renderToStaticMarkup(createElement(AssetTypeRail, {
      language: 'zh-CN',
      assetType: 'world',
      onChange: vi.fn()
    }));

    expect(html).toContain('aria-label="资产类型"');
    expect(html).toContain('>世界<');
    expect(html).toContain('>导出<');
  });

  it('sorts chapters numerically and filters them case-insensitively', () => {
    const html = renderToStaticMarkup(createElement(AssetContextListContent, {
      language: 'en',
      project: projectFixture(),
      assetType: 'chapters',
      selection: { kind: 'chapter', id: '2' },
      collapsed: false,
      query: 'RAIN',
      onQueryChange: vi.fn(),
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    }));

    expect(html.indexOf('Chapter 2: Rainfall')).toBeLessThan(html.indexOf('Chapter 10: After the Rain'));
    expect(html).not.toContain('Chapter 1: Arrival');
  });

  it('shows character profile names', () => {
    const html = renderToStaticMarkup(createElement(AssetContextList, {
      language: 'en',
      project: projectFixture(),
      assetType: 'characters',
      selection: { kind: 'character', id: 'mira' },
      collapsed: false,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    }));

    expect(html).toContain('Mira Rain');
    expect(html).toContain('Orin');
  });

  it('renders summary and export as one asset action each', () => {
    const render = (assetType: 'summary' | 'export') => renderToStaticMarkup(createElement(AssetContextList, {
      language: 'en',
      project: projectFixture(),
      assetType,
      selection: { kind: assetType, id: assetType },
      collapsed: false,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    }));

    expect((render('summary').match(/data-context-action=/g) ?? [])).toHaveLength(1);
    expect((render('export').match(/data-context-action=/g) ?? [])).toHaveLength(1);
  });

  it('localizes the summary action at the presentation boundary', () => {
    const html = renderToStaticMarkup(createElement(AssetContextList, {
      language: 'zh-CN',
      project: projectFixture(),
      assetType: 'summary',
      selection: { kind: 'summary', id: 'summary' },
      collapsed: false,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    }));

    expect(html).toContain('>摘要<');
    expect(html).not.toContain('>Summary<');
  });

  it('remounts local query state synchronously when the asset type changes', () => {
    const base = {
      language: 'en' as const,
      project: projectFixture(),
      selection: { kind: 'chapter' as const, id: '2' },
      collapsed: false,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    };

    const chapters = AssetContextList({ ...base, assetType: 'chapters' });
    const characters = AssetContextList({ ...base, assetType: 'characters' });

    expect(chapters.key).toBe('chapters');
    expect(characters.key).toBe('characters');
  });

  it('routes local search changes through the controlled content boundary', () => {
    const onQueryChange = vi.fn();
    const tree = AssetContextListContent({
      language: 'en',
      project: projectFixture(),
      assetType: 'chapters',
      selection: { kind: 'chapter', id: '2' },
      collapsed: false,
      query: '',
      onQueryChange,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    });
    const search = childElements(tree).find((element) => element.type === 'input');

    search?.props.onChange({ currentTarget: { value: 'RAIN' } });
    expect(onQueryChange).toHaveBeenCalledWith('RAIN');

    const filtered = renderToStaticMarkup(createElement(AssetContextListContent, {
      language: 'en',
      project: projectFixture(),
      assetType: 'chapters',
      selection: { kind: 'chapter', id: '2' },
      collapsed: false,
      query: 'RAIN',
      onQueryChange,
      onSelect: vi.fn(),
      onToggleCollapsed: vi.fn()
    }));
    expect(filtered).not.toContain('Chapter 1: Arrival');
  });

  it.each([
    ['world', { kind: 'world', id: 'bible' }],
    ['characters', { kind: 'character', id: 'mira' }],
    ['acts', { kind: 'plot', id: 'act-1' }],
    ['chapters', { kind: 'chapter', id: '2' }],
    ['summary', { kind: 'summary', id: 'summary' }],
    ['export', { kind: 'export', id: 'export' }]
  ] as const)('maps the %s action to its tree selection', (assetType, expected) => {
    const onSelect = vi.fn();
    const project = projectFixture();
    project.plot = [{ id: 'act-1', label: 'Act One', summary: 'Opening movement', chapterHint: 1 }];
    const tree = AssetContextListContent({
      language: 'en',
      project,
      assetType,
      selection: expected,
      collapsed: false,
      query: '',
      onQueryChange: vi.fn(),
      onSelect,
      onToggleCollapsed: vi.fn()
    });
    const action = childElements(tree).find((element) => element.props['data-context-id'] === expected.id);

    action?.props.onClick();
    expect(onSelect).toHaveBeenCalledWith(expected);
  });

  it('collapses the list without changing the selected asset', () => {
    const onSelect = vi.fn();
    const onToggleCollapsed = vi.fn();
    const tree = AssetContextListContent({
      language: 'en',
      project: projectFixture(),
      assetType: 'chapters',
      selection: { kind: 'chapter', id: '2' },
      collapsed: false,
      query: '',
      onQueryChange: vi.fn(),
      onSelect,
      onToggleCollapsed
    });
    const collapseButton = childElements(tree).find((element) => element.props['data-collapse-asset-list'] === true);

    collapseButton?.props.onClick();
    expect(onToggleCollapsed).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
