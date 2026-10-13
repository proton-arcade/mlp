/**
 * Merge the per-platform SDK coverage shards written by the mixt.js API
 * test runners (src/mixt-js/coverage/shards/coverage-<platform>.json)
 * into the final reports in src/mixt-js/coverage:
 *
 *   coverage-final.json / coverage-summary.json — consumed by the PR
 *   coverage comment action (same files the backend coverage job emits),
 *   lcov.info for external tooling, text (and html locally) for humans.
 *
 * Run via `npm run test:mixtjs:coverage`, which builds the instrumented
 * bundle, runs all three runners with MIXT_COVERAGE=1, then this script.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);
const coverageDir = path.join(repoRoot, 'src/mixt-js/coverage');
const shardsDir = path.join(coverageDir, 'shards');

const shardFiles = existsSync(shardsDir)
    ? readdirSync(shardsDir).filter((f) => f.endsWith('.json'))
    : [];
if (shardFiles.length === 0) {
    console.error(
        `No coverage shards found in ${shardsDir}.\n` +
            'Run the suites in coverage mode first: npm run test:mixtjs:coverage',
    );
    process.exit(1);
}

const coverageMap = libCoverage.createCoverageMap({});
for (const file of shardFiles) {
    coverageMap.merge(
        JSON.parse(readFileSync(path.join(shardsDir, file), 'utf8')),
    );
}

const context = libReport.createContext({
    dir: coverageDir,
    coverageMap,
});

const isCi = process.env.CI === 'true';
const reporters = ['json', 'json-summary', 'lcov', 'text'];
if (!isCi) reporters.push('html');
for (const reporter of reporters) {
    reports.create(reporter).execute(context);
}

console.log(
    `\nMerged ${shardFiles.length} shard(s): ${shardFiles.join(', ')}`,
);
console.log(`Reports written to ${coverageDir}`);
