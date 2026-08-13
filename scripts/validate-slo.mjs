#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const slo = JSON.parse(await readFile(resolve(root, 'portfolio-slo.json'), 'utf8'));
const schema = JSON.parse(await readFile(resolve(root, 'portfolio-slo.schema.json'), 'utf8'));

const fail = (message) => {
  throw new Error(`portfolio SLO contract invalid: ${message}`);
};
const equal = (actual, expected, label) => {
  if (actual !== expected) fail(`${label} must be ${JSON.stringify(expected)}`);
};
const nonEmpty = (value, label) => {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
};

for (const [key, value] of Object.entries({
  schema_version: 'belacca.portfolio-slo.v1',
  service: 'portfolio',
  owner: 'francesco-belacca-site',
})) equal(slo[key], value, key);
equal(slo.objective.target, 0.99, 'objective.target');
equal(slo.objective.window, '30d', 'objective.window');
equal(slo.objective.classification, 'internal_objective', 'objective.classification');
equal(slo.objective.sla, false, 'objective.sla');
equal(slo.measurement.state, 'measured', 'measurement.state');
equal(slo.measurement.measurement_window, 'available_history', 'measurement.measurement_window');
equal(slo.measurement.source, 'external_user_journey', 'measurement.source');
equal(slo.measurement.build_metadata_is_evidence, false, 'measurement.build_metadata_is_evidence');
equal(slo.sli.id, 'portfolio_user_journey_availability', 'sli.id');
equal(slo.sli.calculation, 'good_events / total_events', 'sli.calculation');
equal(slo.dependency_policy.primary_availability_impact, 'excluded', 'dependency_policy.primary_availability_impact');
equal(slo.journey_assertions.path_and_query_preserved, true, 'journey_assertions.path_and_query_preserved');
equal(slo.rollback.method, 'reviewed_git_revert', 'rollback.method');

if (!Array.isArray(slo.sli.checks) || slo.sli.checks.length !== 2) fail('sli.checks must contain health and homepage');
for (const check of slo.sli.checks) {
  nonEmpty(check.id, 'check.id');
  nonEmpty(check.path, 'check.path');
  equal(check.method, 'GET', `${check.id}.method`);
  equal(check.expected_status, 200, `${check.id}.expected_status`);
}
if (!slo.sli.checks.some((check) => check.id === 'health' && check.path === '/health' && check.expected_body === 'ok')) fail('health check contract is missing');
if (!slo.sli.checks.some((check) => check.id === 'homepage' && check.path === '/' && check.expected_body_markers?.includes('<!doctype html'))) fail('homepage check contract is missing');
if (schema.properties?.objective?.properties?.target?.const !== 0.99) fail('schema does not pin the 99% objective');
if (JSON.stringify(slo).match(/BUILD_SHA|BUILD_RUN_ID|build identifier.*availability/i)) fail('build metadata must not be availability evidence');

console.log('portfolio SLO contract valid: belacca.portfolio-slo.v1 (current measured level; 99%/30d internal objective)');
