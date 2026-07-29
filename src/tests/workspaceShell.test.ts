import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceShell } from '../renderer/components/WorkspaceShell';

describe('WorkspaceShell', () => {
  it('renders the five workspace regions without owning their business UI', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceShell, {
      assetType: 'chapters',
      assetListCollapsed: false,
      contextRailExpanded: true,
      onAssetTypeChange: vi.fn(),
      onToggleAssetList: vi.fn(),
      onToggleContextRail: vi.fn(),
      header: createElement('span', null, 'Header slot'),
      assetTypeRail: ({ assetType }) => createElement('span', null, `Asset ${assetType}`),
      assetContextList: ({ assetListCollapsed }) => createElement('span', null, assetListCollapsed ? 'Collapsed' : 'Assets'),
      editor: createElement('article', null, 'Editor slot'),
      contextRail: ({ contextRailExpanded }) => createElement('span', null, contextRailExpanded ? 'Expanded' : 'Collapsed')
    }));

    for (const region of ['workspace-header', 'asset-type-rail', 'asset-context-list', 'editor-pane', 'context-rail']) {
      expect(html).toContain(`data-workspace-region="${region}"`);
    }
    expect(html).toContain('Asset chapters');
    expect(html).toContain('Editor slot');
  });

  it('passes shell state and callbacks to presentation slots', () => {
    const onAssetTypeChange = vi.fn();
    const onToggleAssetList = vi.fn();
    const onToggleContextRail = vi.fn();

    WorkspaceShell({
      assetType: 'world',
      assetListCollapsed: true,
      contextRailExpanded: false,
      onAssetTypeChange,
      onToggleAssetList,
      onToggleContextRail,
      header: null,
      assetTypeRail: (props) => {
        expect(props.assetType).toBe('world');
        props.onAssetTypeChange('summary');
        return null;
      },
      assetContextList: (props) => {
        expect(props.assetListCollapsed).toBe(true);
        props.onToggleAssetList();
        return null;
      },
      editor: null,
      contextRail: (props) => {
        expect(props.contextRailExpanded).toBe(false);
        props.onToggleContextRail();
        return null;
      }
    });

    expect(onAssetTypeChange).toHaveBeenCalledWith('summary');
    expect(onToggleAssetList).toHaveBeenCalledOnce();
    expect(onToggleContextRail).toHaveBeenCalledOnce();
  });
});
