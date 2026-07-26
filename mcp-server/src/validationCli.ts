import { formatValidationSummary, runValidationCommand } from './validationCommand.js';

try {
  process.stdout.write(`${formatValidationSummary(runValidationCommand())}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Validation failed unexpectedly.'}\n`);
  process.exitCode = 1;
}
