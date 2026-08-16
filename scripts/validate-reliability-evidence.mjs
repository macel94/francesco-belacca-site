#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const evidence = JSON.parse(await readFile(resolve(root, 'reliability-evidence.json'), 'utf8'));
const schema = JSON.parse(await readFile(resolve(root, 'reliability-evidence.schema.json'), 'utf8'));
const fail = (message) => { throw new Error(`reliability evidence invalid: ${message}`); };
const date = (value) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
const url = (value) => typeof value === 'string' && /^https?:\/\//u.test(value) && value.length <= 500;
const nonEmpty = (value, max = 500) => typeof value === 'string' && value.length > 0 && value.length <= max;

if (schema.properties?.schema_version?.const !== 'belacca.reliability-evidence.v1') fail('schema does not pin the expected version');
if (evidence.$schema !== './reliability-evidence.schema.json' || evidence.schema_version !== 'belacca.reliability-evidence.v1' || evidence.sanitized !== true || !Number.isFinite(Date.parse(evidence.generated_at)) || !url(evidence.source_repository)) fail('invalid artifact metadata');
if (!Array.isArray(evidence.entries) || evidence.entries.length < 1 || evidence.entries.length > 20) fail('entries must be bounded and non-empty');
const states = new Set(['verified', 'bounded', 'outstanding', 'declared']);
const IDs = new Set();
for (const [index, entry] of evidence.entries.entries()) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`entries[${index}] must be an object`);
  if (!nonEmpty(entry.id, 80) || IDs.has(entry.id)) fail(`entries[${index}].id must be unique and non-empty`);
  IDs.add(entry.id);
  if (!nonEmpty(entry.name, 120) || !states.has(entry.state) || !nonEmpty(entry.summary) || !date(entry.observed_at) || !date(entry.source_updated_at)) fail(`entries[${index}] has invalid identity, state, summary, or timestamp`);
  if (!Array.isArray(entry.source_references) || entry.source_references.length < 1 || entry.source_references.length > 10 || !entry.source_references.every(url)) fail(`entries[${index}] has invalid references`);
  if (!Array.isArray(entry.limitations) || entry.limitations.length > 10 || !entry.limitations.every((item) => nonEmpty(item, 300))) fail(`entries[${index}] has invalid limitations`);
}
if (!IDs.has('backup-upload-restore') || !IDs.has('backup-retention') || !IDs.has('notification-routing') || !IDs.has('portfolio-replicas')) fail('required evidence boundaries are missing');
if (JSON.stringify(evidence).match(/token|password|secret|private[_ -]?key|player|room[_ -]?id|127\.0\.0\.1/i)) fail('sensitive evidence marker found');

console.log('reliability evidence valid: belacca.reliability-evidence.v1 (sanitized, source-linked, bounded)');
