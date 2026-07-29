import type { ReactNode } from 'react';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';
import type { AssetType } from './workspaceModel.js';

interface AssetTypeRailSlotProps {
  assetType: AssetType;
  onAssetTypeChange: (assetType: AssetType) => void;
}

interface AssetContextListSlotProps {
  assetType: AssetType;
  assetListCollapsed: boolean;
  onToggleAssetList: () => void;
}

interface ContextRailSlotProps {
  contextRailExpanded: boolean;
  onToggleContextRail: () => void;
}

export interface WorkspaceShellProps {
  language?: Language;
  assetType: AssetType;
  assetListCollapsed: boolean;
  contextRailExpanded: boolean;
  onAssetTypeChange: (assetType: AssetType) => void;
  onToggleAssetList: () => void;
  onToggleContextRail: () => void;
  header: ReactNode;
  assetTypeRail: (props: AssetTypeRailSlotProps) => ReactNode;
  assetContextList: (props: AssetContextListSlotProps) => ReactNode;
  editor: ReactNode;
  contextRail: (props: ContextRailSlotProps) => ReactNode;
}

export function WorkspaceShell({
  language = 'en',
  assetType,
  assetListCollapsed,
  contextRailExpanded,
  onAssetTypeChange,
  onToggleAssetList,
  onToggleContextRail,
  header,
  assetTypeRail,
  assetContextList,
  editor,
  contextRail
}: WorkspaceShellProps) {
  return (
    <div
      className="workspace-shell"
      data-asset-list-collapsed={assetListCollapsed}
      data-context-rail-expanded={contextRailExpanded}
    >
      <header data-workspace-region="workspace-header">{header}</header>
      <nav data-workspace-region="asset-type-rail" aria-label={t(language, 'workspace.assetTypes')}>
        {assetTypeRail({ assetType, onAssetTypeChange })}
      </nav>
      <aside
        data-workspace-region="asset-context-list"
        data-collapsed={assetListCollapsed}
        aria-label={t(language, 'workspace.assetList')}
      >
        {assetContextList({ assetType, assetListCollapsed, onToggleAssetList })}
      </aside>
      <main data-workspace-region="editor-pane">{editor}</main>
      <aside
        data-workspace-region="context-rail"
        data-expanded={contextRailExpanded}
        aria-label={t(language, 'workspace.contextRail')}
      >
        {contextRail({ contextRailExpanded, onToggleContextRail })}
      </aside>
    </div>
  );
}
