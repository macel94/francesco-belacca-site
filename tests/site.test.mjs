import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFile(resolve(root, file), 'utf8');

test('site has a semantic document shell and canonical metadata', async () => {
  const html = await read('index.html');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main id="top">/);
  assert.match(html, /<h1 id="hero-title">/);
  assert.match(html, /https:\/\/francesco\.belacca\.com\//);
  assert.match(html, /Cloud Native Pong/);
  assert.match(html, /mailto:francesco\.belacca@hotmail\.it/);
});

test('navigation targets exist and external links are protected', async () => {
  const html = await read('index.html');
  for (const id of ['about', 'work', 'stack', 'contact']) assert.match(html, new RegExp(`id="${id}"`));
  const externalTargets = [...html.matchAll(/target="_blank"(.*?)>/g)].map((match) => match[1]);
  assert.ok(externalTargets.length >= 4);
  externalTargets.forEach((attrs) => assert.match(attrs, /rel="noreferrer"/));
});

test('work section features the requested projects', async () => {
  const html = await read('index.html');
  assert.match(html, /href="https:\/\/github\.com\/macel94\/belacca-platform"/);
  assert.match(html, /Belacca Platform/);
  assert.match(html, /A GitOps workspace orchestrating the public platform/);
  assert.match(html, /href="https:\/\/github\.com\/macel94\/eu-azfoundry-scout"/);
  assert.match(html, /EU Azure Foundry Scout/);
  assert.match(html, /href="https:\/\/github\.com\/macel94\/postquantumdotnettest"/);
  assert.match(html, /Post-Quantum \.NET/);
  assert.doesNotMatch(html, /github\.com\/macel94\/azcockpit/);
  assert.doesNotMatch(html, /Azure Cockpit/);
});

test('site discovery assets are linked and shipped', async () => {
  const html = await read('index.html');
  const dockerfile = await read('Dockerfile');
  const manifest = await read('site.webmanifest');
  const robots = await read('robots.txt');
  const llms = await read('llms.txt');
  const sitemap = await read('sitemap.xml');
  assert.match(html, /href="\/favicon\.svg" type="image\/svg\+xml"/);
  assert.match(html, /href="\/favicon\.ico" type="image\/x-icon"/);
  assert.match(html, /href="\/site\.webmanifest"/);
  assert.match(dockerfile, /favicon\.svg favicon\.ico site\.webmanifest robots\.txt llms\.txt sitemap\.xml/);
  assert.match(manifest, /"start_url": "\/"/);
  assert.match(manifest, /"theme_color": "#070a0e"/);
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Sitemap: https:\/\/francesco\.belacca\.com\/sitemap\.xml/);
  assert.match(llms, /^# Francesco Belacca/m);
  assert.match(llms, /https:\/\/github\.com\/macel94\/eu-azfoundry-scout/);
  assert.match(llms, /https:\/\/github\.com\/macel94\/postquantumdotnettest/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/<\/loc>/);
});

test('animation layer includes a reduced-motion path', async () => {
  const css = await read('styles.css');
  const js = await read('app.js');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
});

test('container serves a health endpoint with a hardened nginx config', async () => {
  const dockerfile = await read('Dockerfile');
  const nginx = await read('nginx.conf');
  assert.match(dockerfile, /docker\.io\/library\/nginx:1\.27-alpine/);
  assert.match(nginx, /location = \/health/);
  assert.match(nginx, /Content-Security-Policy/);
  assert.match(nginx, /X-Content-Type-Options/);
});
