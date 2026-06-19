/**
 * Vitest configuration for Vrindaya.
 *
 * Angular 21's @angular/build:unit-test builder loads this file via
 * Vitest's standard config resolution, then merges it with Angular's
 * internal setup (test environment, browser emulation).  Angular's config
 * takes precedence for core settings; our config controls coverage output
 * and CI reporters.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // In CI produce verbose output + a JUnit XML report consumed by SonarCloud.
    // In local dev the default (compact) reporter is used.
    reporters: process.env['CI']
      ? ['verbose', ['junit', { outputFile: 'test-results/junit.xml' }]]
      : ['default'],

    coverage: {
      // Always generate coverage; the V8 provider adds negligible overhead.
      enabled: true,
      provider: 'v8',

      // lcov.info → consumed by SonarCloud for coverage metrics.
      // html      → human-readable report in coverage/
      // text      → printed to the terminal during CI
      reporter: ['lcov', 'text', 'html'],

      reportsDirectory: './coverage',

      include: ['src/**/*.ts'],

      // Exclude files that are either untestable bootstrap code or already
      // covered by their own dedicated analysis (spec files, environments).
      exclude: [
        'src/**/*.spec.ts',
        'src/environments/**',
        'src/main.ts',
        'src/main.server.ts',
        'src/app/app.config.ts',
        'src/app/app.config.server.ts',
        'src/app/app.routes.server.ts',
        '**/*.d.ts',
      ],
    },
  },
});
