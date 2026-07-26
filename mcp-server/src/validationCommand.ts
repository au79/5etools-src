import { type EffectiveConfiguration, resolveConfiguration, type ResolveConfigurationOptions } from './config.js';
import { validateCatalogProjectRoot, type ValidationResult } from './validation.js';

export interface ValidationCommandResult {
  readonly configuration: EffectiveConfiguration;
  readonly results: readonly ValidationResult[];
}

export function runValidationCommand(options: ResolveConfigurationOptions = {}): ValidationCommandResult {
  const configuration = resolveConfiguration(options);
  const results = configuration.sourceRoots.map((sourceRoot) =>
    validateCatalogProjectRoot(configuration.projectRoot, sourceRoot.name),
  );

  return { configuration, results };
}

export function formatValidationSummary(result: ValidationCommandResult): string {
  const fileCount = result.results.reduce((count, validation) => count + validation.files.length, 0);
  const sourceRoots = result.configuration.sourceRoots.map((sourceRoot) => sourceRoot.name).join(', ');
  return `Validation succeeded: ${fileCount} files across ${sourceRoots}.`;
}
