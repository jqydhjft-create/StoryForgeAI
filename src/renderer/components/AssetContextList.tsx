import { useState } from 'react';
import type { StoryProject } from '../../shared/types.js';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';
import {
  resolveContextList,
  type AssetType,
  type ContextListItem,
  type TreeSelection
} from './workspaceModel.js';

export interface AssetContextListProps {
  language: Language;
  project: StoryProject;
  assetType: AssetType;
  selection: TreeSelection;
  collapsed: boolean;
  onSelect: (selection: TreeSelection) => void;
  onToggleCollapsed: () => void;
}

export interface AssetContextListContentProps extends AssetContextListProps {
  query: string;
  onQueryChange: (query: string) => void;
}

function selectionForItem(item: ContextListItem): TreeSelection {
  switch (item.kind) {
    case 'world':
      return { kind: 'world', id: item.id };
    case 'characters':
      return { kind: 'character', id: item.id };
    case 'acts':
      return { kind: 'plot', id: item.id };
    case 'scene_outline':
      return { kind: 'scene_outline', id: item.id };
    case 'chapters':
      return { kind: 'chapter', id: item.id };
    case 'summary':
      return { kind: 'summary', id: item.id };
  }
}

function isSelected(selection: TreeSelection, candidate: TreeSelection): boolean {
  return selection.kind === candidate.kind && selection.id === candidate.id;
}

export function AssetContextListContent({
  language,
  project,
  assetType,
  selection,
  collapsed,
  query,
  onQueryChange,
  onSelect,
  onToggleCollapsed
}: AssetContextListContentProps) {
  const searchLabel = t(language, 'workspace.searchAssets');
  const collapseLabel = t(language, 'workspace.collapseList');
  const expandLabel = t(language, 'workspace.expandList');
  const items = resolveContextList({ kind: assetType, project, query });

  return (
    <div className="asset-context-list" data-asset-type={assetType} data-collapsed={collapsed}>
      <button
        type="button"
        className="asset-list-collapse"
        data-collapse-asset-list
        aria-label={collapsed ? expandLabel : collapseLabel}
        onClick={onToggleCollapsed}
      >
        <span>{collapsed ? expandLabel : collapseLabel}</span>
      </button>

      {collapsed ? null : (
        <div className="asset-context-list-body">
          {assetType === 'summary' || assetType === 'export' ? null : (
            <label className="asset-search">
              <span>{searchLabel}</span>
              <input
                type="search"
                value={query}
                aria-label={searchLabel}
                onChange={(event) => onQueryChange(event.currentTarget.value)}
              />
            </label>
          )}

          {assetType === 'export' ? (
            <button
              type="button"
              data-context-action="export"
              data-context-id="export"
              aria-current={selection.kind === 'export' ? 'page' : undefined}
              onClick={() => onSelect({ kind: 'export', id: 'export' })}
            >
              {t(language, 'workspace.asset.export')}
            </button>
          ) : items.length > 0 ? (
            <div className="asset-context-items">
              {items.map((item) => {
                const candidate = selectionForItem(item);
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    data-context-action={item.kind}
                    data-context-id={item.id}
                    aria-current={isSelected(selection, candidate) ? 'page' : undefined}
                    onClick={() => onSelect(candidate)}
                  >
                    <strong>{item.kind === 'summary' ? t(language, 'workspace.asset.summary') : item.label}</strong>
                    {item.detail ? <span>{item.detail}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="asset-context-empty">{t(language, 'workspace.noMatchingAssets')}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AssetContextListState(props: AssetContextListProps) {
  const [query, setQuery] = useState('');

  return <AssetContextListContent {...props} query={query} onQueryChange={setQuery} />;
}

export function AssetContextList(props: AssetContextListProps) {
  return <AssetContextListState key={props.assetType} {...props} />;
}
