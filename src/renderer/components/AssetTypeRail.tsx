import type { Language } from '../i18n.js';
import { t } from '../i18n.js';
import type { AssetType } from './workspaceModel.js';

export interface AssetTypeRailProps {
  language: Language;
  assetType: AssetType;
  onChange: (assetType: AssetType) => void;
}

const assetTypes: AssetType[] = ['world', 'characters', 'acts', 'scene_outline', 'chapters', 'summary', 'export'];

export function AssetTypeRail({ language, assetType, onChange }: AssetTypeRailProps) {
  return (
    <div className="asset-type-rail" aria-label={t(language, 'workspace.assetTypes')}>
      {assetTypes.map((type) => {
        const label = t(language, `workspace.asset.${type}` as Parameters<typeof t>[1]);
        return (
          <button
            key={type}
            type="button"
            className={assetType === type ? 'asset-type-button active' : 'asset-type-button'}
            data-asset-type={type}
            aria-current={assetType === type ? 'page' : undefined}
            aria-label={label}
            onClick={() => onChange(type)}
          >
            <span className="asset-type-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
