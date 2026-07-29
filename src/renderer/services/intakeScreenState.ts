export type IntakeScreen = 'starter' | 'confirm' | 'workspace';

export function resolveIntakeScreen(input: { persistedArtifact: unknown; draft: unknown }): IntakeScreen {
  if (input.persistedArtifact) return 'workspace';
  return input.draft ? 'confirm' : 'starter';
}
