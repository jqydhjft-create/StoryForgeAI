import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BenchmarkAudit, type BenchmarkAuditProps } from '../renderer/components/BenchmarkAudit';
import { ProviderSettings, type ProviderSettingsProps } from '../renderer/components/ProviderSettings';
import { SettingsDiagnostics, type SettingsDiagnosticsProps } from '../renderer/components/SettingsDiagnostics';
import { WorkflowLogs } from '../renderer/components/WorkflowLogs';
import { ContextRail } from '../renderer/components/ContextRail';
import { WorkspaceShell } from '../renderer/components/WorkspaceShell';
import { createInitialWorkflowState } from '../shared/workflowDefaults';

function visit(node: ReactNode, predicate: (element: ReactElement) => boolean): ReactElement | null {
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;
  const children = (node.props as { children?: ReactNode }).children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = visit(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return visit(children, predicate);
}

function providerProps(overrides: Partial<ProviderSettingsProps> = {}): ProviderSettingsProps {
  return {
    aiStatus: { configured: true, provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
    aiConnectionResult: { ok: true, provider: 'deepseek', model: 'deepseek-v4-pro', message: 'Connection ready' },
    aiConfigDraft: { provider: 'deepseek', apiKey: '', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
    isAiTesting: false,
    isAiConfigApplying: false,
    onAiConfigDraftChange: vi.fn(),
    onApiKeyChange: vi.fn(),
    onApplyAiConfig: vi.fn(),
    onTestAiConnection: vi.fn(),
    ...overrides
  };
}

function benchmarkProps(overrides: Partial<BenchmarkAuditProps> = {}): BenchmarkAuditProps {
  return {
    aiStatus: { configured: true, provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
    isBenchmarkRunning: false,
    benchmarkStatus: '12 cases completed',
    benchmarkRetryPath: 'D:\\Writer\\benchmark-output\\run-1',
    onRunRealBenchmark: vi.fn(),
    onRetryFailedBenchmark: vi.fn(),
    onBenchmarkRetryPathChange: vi.fn(),
    ...overrides
  };
}

function diagnosticsProps(overrides: Partial<SettingsDiagnosticsProps> = {}): SettingsDiagnosticsProps {
  return {
    ...providerProps(),
    workflowLog: ['World outline generated', 'Chapter draft saved'],
    ...benchmarkProps(),
    onBack: vi.fn(),
    ...overrides
  };
}

describe('SettingsDiagnostics', () => {
  it('renders a localized clear API key action and forwards it', () => {
    const onClearApiKey = vi.fn();
    const props = diagnosticsProps({ onClearApiKey });
    const tree = ProviderSettings(providerProps({ onClearApiKey }));
    const clear = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'clear-api-key');

    (clear?.props as { onClick: () => void }).onClick();

    expect(renderToStaticMarkup(createElement(SettingsDiagnostics, props))).toContain('Clear API key');
    expect(onClearApiKey).toHaveBeenCalledOnce();
  });

  it('keeps provider setup available while hiding desktop benchmark controls in browser mode', () => {
    const html = renderToStaticMarkup(createElement(SettingsDiagnostics, diagnosticsProps({ showBenchmark: false })));

    expect(html).toContain('Model provider');
    expect(html).toContain('API key');
    expect(html).not.toContain('benchmark-audit');
    expect(html).not.toContain('run-real-benchmark');
  });

  it('localizes browser provider fields in Chinese', () => {
    const html = renderToStaticMarkup(createElement(ProviderSettings, providerProps({ language: 'zh-CN' })));

    expect(html).toContain('提供商');
    expect(html).toContain('API 密钥');
    expect(html).toContain('应用配置');
    expect(html).not.toContain('Apply configuration');
  });

  it('renders provider status, workflow logs, benchmark audit controls, and a workspace return action', () => {
    const onBack = vi.fn();
    const props = diagnosticsProps({ onBack });
    const html = renderToStaticMarkup(createElement(SettingsDiagnostics, props));
    const tree = SettingsDiagnostics(props);
    const back = visit(tree, (element) => element.type === 'button' && element.props.children === 'Back to workspace');

    (back?.props as { onClick: () => void }).onClick();

    expect(html).toContain('Settings &amp; Diagnostics');
    expect(html).toContain('deepseek');
    expect(html).toContain('configured');
    expect(html).toContain('World outline generated');
    expect(html).toContain('Chapter draft saved');
    expect(html).toContain('Run real A/B benchmark');
    expect(html).toContain('Retry failed real A/B cases');
    expect(html).toContain('Back to workspace');
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('consumes the central Chinese diagnostics title and workspace return label', () => {
    const html = renderToStaticMarkup(createElement(SettingsDiagnostics, diagnosticsProps({ language: 'zh-CN' })));

    expect(html).toContain('设置与诊断');
    expect(html).toContain('返回工作区');
    expect(html).toContain('模型提供商');
    expect(html).toContain('基准审计');
    expect(html).toContain('配置模型提供商，并检查本地工作流和基准活动。');
  });

  it('passes provider configuration, apply, and connection-test actions through without rendering API key text', () => {
    const onAiConfigDraftChange = vi.fn();
    const onApplyAiConfig = vi.fn();
    const onTestAiConnection = vi.fn();
    const onApiKeyChange = vi.fn();
    const props = providerProps({ onAiConfigDraftChange, onApplyAiConfig, onTestAiConnection, onApiKeyChange });
    const tree = ProviderSettings(props);
    const apply = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'apply-provider-config');
    const testConnection = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'test-provider-connection');
    const model = visit(tree, (element) => element.type === 'input' && element.props['data-field'] === 'provider-model');
    const html = renderToStaticMarkup(createElement(ProviderSettings, props));

    (apply?.props as { onClick: () => void }).onClick();
    (testConnection?.props as { onClick: () => void }).onClick();
    (model?.props as { onChange: (event: { target: { value: string } }) => void }).onChange({ target: { value: 'alternate-model' } });

    expect(onApplyAiConfig).toHaveBeenCalledOnce();
    expect(onTestAiConnection).toHaveBeenCalledOnce();
    expect(onAiConfigDraftChange).toHaveBeenCalledWith({
      provider: 'deepseek',
      model: 'alternate-model',
      baseUrl: 'https://api.deepseek.com'
    });
    expect(onApiKeyChange).not.toHaveBeenCalled();
    expect(html).toContain('Connection ready');
    expect(html).not.toContain('apiKey');
  });

  it('uses the dedicated API key callback only for password input changes', () => {
    const onAiConfigDraftChange = vi.fn();
    const onApiKeyChange = vi.fn();
    const tree = ProviderSettings(providerProps({ onAiConfigDraftChange, onApiKeyChange }));
    const apiKeyInput = visit(tree, (element) => element.type === 'input' && element.props['aria-label'] === 'API key');

    (apiKeyInput?.props as { onChange: (event: { target: { value: string } }) => void }).onChange({ target: { value: 'synthetic-password-entry' } });

    expect(onApiKeyChange).toHaveBeenCalledWith('synthetic-password-entry');
    expect(onAiConfigDraftChange).not.toHaveBeenCalled();
  });

  it('strips a runtime API key from normal configuration callback payloads', () => {
    const onAiConfigDraftChange = vi.fn();
    const unsafeRuntimeDraft = {
      ...providerProps().aiConfigDraft,
      apiKey: 'synthetic-runtime-only-value'
    } as ProviderSettingsProps['aiConfigDraft'];
    const tree = ProviderSettings(providerProps({ aiConfigDraft: unsafeRuntimeDraft, onAiConfigDraftChange }));
    const baseUrl = visit(tree, (element) => element.type === 'input' && element.props['data-field'] === 'provider-base-url');

    (baseUrl?.props as { onChange: (event: { target: { value: string } }) => void }).onChange({ target: { value: 'https://provider.example/v1' } });

    expect(onAiConfigDraftChange).toHaveBeenCalledWith({
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      baseUrl: 'https://provider.example/v1'
    });
    expect(onAiConfigDraftChange.mock.calls[0]?.[0]).not.toHaveProperty('apiKey');
  });

  it('disables provider fields and both provider actions while either provider operation is busy', () => {
    for (const busyProps of [
      providerProps({ isAiTesting: true }),
      providerProps({ isAiConfigApplying: true })
    ]) {
      const tree = ProviderSettings(busyProps);
      const inputs = [
        visit(tree, (element) => element.type === 'select'),
        visit(tree, (element) => element.type === 'input' && element.props['data-field'] === 'provider-model'),
        visit(tree, (element) => element.type === 'input' && element.props['data-field'] === 'provider-base-url'),
        visit(tree, (element) => element.type === 'input' && element.props['aria-label'] === 'API key')
      ];
      const apply = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'apply-provider-config');
      const testConnection = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'test-provider-connection');

      expect(inputs.every((input) => input?.props.disabled === true)).toBe(true);
      expect(apply?.props.disabled).toBe(true);
      expect(testConnection?.props.disabled).toBe(true);
    }
  });

  it('passes benchmark run, retry, and output-folder actions through', () => {
    const onRunRealBenchmark = vi.fn();
    const onRetryFailedBenchmark = vi.fn();
    const onBenchmarkRetryPathChange = vi.fn();
    const props = benchmarkProps({ onRunRealBenchmark, onRetryFailedBenchmark, onBenchmarkRetryPathChange });
    const tree = BenchmarkAudit(props);
    const run = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'run-real-benchmark');
    const retry = visit(tree, (element) => element.type === 'button' && element.props['data-action'] === 'retry-failed-benchmark');
    const path = visit(tree, (element) => element.type === 'input' && element.props['data-field'] === 'benchmark-output-path');

    (run?.props as { onClick: () => void }).onClick();
    (retry?.props as { onClick: () => void }).onClick();
    (path?.props as { onChange: (event: { target: { value: string } }) => void }).onChange({ target: { value: 'D:\\Writer\\benchmark-output\\retry' } });

    expect(onRunRealBenchmark).toHaveBeenCalledOnce();
    expect(onRetryFailedBenchmark).toHaveBeenCalledOnce();
    expect(onBenchmarkRetryPathChange).toHaveBeenCalledWith('D:\\Writer\\benchmark-output\\retry');
  });

  it('keeps benchmark controls out of the daily workspace shell and workflow context rail', () => {
    const shellHtml = renderToStaticMarkup(createElement(WorkspaceShell, {
      assetType: 'world',
      assetListCollapsed: false,
      contextRailExpanded: true,
      onAssetTypeChange: vi.fn(),
      onToggleAssetList: vi.fn(),
      onToggleContextRail: vi.fn(),
      header: null,
      assetTypeRail: () => null,
      assetContextList: () => null,
      editor: null,
      contextRail: () => null
    }));
    const railHtml = renderToStaticMarkup(createElement(ContextRail, {
      language: 'en',
      workflow: createInitialWorkflowState(),
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'intake',
      expanded: true,
      isBusy: false,
      statusText: '',
      errorText: '',
      now: 0,
      onGenerateStage: vi.fn(),
      onConfirmStage: vi.fn(),
      onRegenerateStage: vi.fn(),
      onForceSaveChapter: vi.fn(),
      onReturnCurrent: vi.fn(),
      onRetry: vi.fn(),
      onToggle: vi.fn()
    }));

    expect(shellHtml).not.toMatch(/benchmark/i);
    expect(railHtml).not.toMatch(/benchmark/i);
  });

  it('renders an ordered workflow log', () => {
    const html = renderToStaticMarkup(createElement(WorkflowLogs, { workflowLog: ['First', 'Second'] }));

    expect(html).toContain('<ol');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<li>Second</li>');
  });

  it('redacts arbitrary diagnostic strings across connection results, workflow logs, and benchmark status', () => {
    const rawApiAssignment = 'api-key = synthetic-secret-value';
    const rawAuthorization = 'Authorization: Bearer synthetic-bearer-token-value';
    const rawBareBearer = 'Bearer synthetic-bearer-token-value';
    const rawBasicAuthorization = 'Authorization: Basic synthetic-basic-credential';
    const rawTokenAuthorization = 'Authorization: Token synthetic-token-credential';
    const rawJsonApiKey = '{"api_key":"synthetic-json-secret"}';
    const rawKeyAssignment = 'key: synthetic-key-value';
    const rawTokenAssignment = 'token: synthetic-token-value';
    const rawPasswordAssignment = 'password = synthetic-password-value';
    const rawProviderToken = 'sk-abcdefghijklmnopqrstuvwxyz0123456789';
    const rawOpaqueToken = 'opaque_abcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rawJwt = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.signaturevalue';
    const html = renderToStaticMarkup(createElement(SettingsDiagnostics, diagnosticsProps({
      aiConnectionResult: { ok: false, provider: 'deepseek', model: 'deepseek-v4-pro', message: `${rawApiAssignment}; ${rawBasicAuthorization}; ${rawJsonApiKey}` },
      workflowLog: [rawBareBearer, rawTokenAuthorization, rawKeyAssignment, rawTokenAssignment, rawPasswordAssignment, rawProviderToken, rawOpaqueToken, rawJwt],
      benchmarkStatus: `Benchmark stopped: ${rawAuthorization}`
    })));

    for (const rawValue of [rawApiAssignment, rawAuthorization, rawBareBearer, rawBasicAuthorization, rawTokenAuthorization, rawJsonApiKey, rawKeyAssignment, rawTokenAssignment, rawPasswordAssignment, rawProviderToken, rawOpaqueToken, rawJwt]) {
      expect(html).not.toContain(rawValue);
    }
    for (const secretSegment of ['synthetic-basic-credential', 'synthetic-token-credential', 'synthetic-json-secret']) {
      expect(html).not.toContain(secretSegment);
    }
    expect(html).toContain('[redacted]');
  });
});
