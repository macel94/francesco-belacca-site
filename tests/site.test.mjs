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
  assert.match(html, /class="build-version"/);
  assert.match(html, /__BUILD_SHA__/);
  assert.match(html, /__BUILD_SHA_SHORT__/);
  assert.match(html, /https:\/\/francesco\.belacca\.com\//);
  assert.match(html, /Cloud Native Pong/);
  assert.match(html, /mailto:francesco\.belacca@hotmail\.it/);
});

test('analytics stays first-party and cookie-free', async () => {
  const html = await read('index.html');
  const privacy = await read('privacy.html');
  const tracker = await read('count.js');
  const nginx = await read('nginx.conf');
  assert.match(html, /data-goatcounter="\/count" async src="\/count\.js"/);
  assert.match(html, /href="\/privacy\.html"/);
  assert.match(privacy, /self-hosted analytics/);
  assert.match(privacy, /does not use advertising trackers/);
  assert.match(tracker, /GoatCounter/);
  assert.doesNotMatch(tracker, /gc\.zgo\.at|zgo\.at\/count/);
  assert.match(nginx, /location = \/count \{/);
  assert.match(nginx, /resolver 10\.43\.0\.10 valid=30s;/);
  assert.match(nginx, /set \$goatcounter_upstream goatcounter\.analytics\.svc\.cluster\.local;/);
  assert.match(nginx, /proxy_pass http:\/\/\$goatcounter_upstream;/);
  assert.match(nginx, /proxy_set_header Host stats\.belacca\.com;/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
  assert.match(nginx, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.match(nginx, /location = \/count\.js \{/);
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
  const privacy = await read('privacy.html');
  assert.match(html, /href="\/favicon\.svg" type="image\/svg\+xml"/);
  assert.match(html, /href="\/favicon\.ico" type="image\/x-icon"/);
  assert.match(html, /href="\/site\.webmanifest"/);
  assert.match(dockerfile, /index\.html privacy\.html styles\.css app\.js count\.js favicon\.svg favicon\.ico site\.webmanifest robots\.txt llms\.txt sitemap\.xml/);
  assert.match(dockerfile, /ARG BUILD_SHA=dev/);
  assert.match(dockerfile, /__BUILD_SHA_SHORT__/);
  assert.match(manifest, /"start_url": "\/"/);
  assert.match(manifest, /"theme_color": "#070a0e"/);
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Sitemap: https:\/\/francesco\.belacca\.com\/sitemap\.xml/);
  assert.match(llms, /^# Francesco Belacca/m);
  assert.match(llms, /https:\/\/github\.com\/macel94\/eu-azfoundry-scout/);
  assert.match(llms, /https:\/\/github\.com\/macel94\/postquantumdotnettest/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/privacy\.html<\/loc>/);
});

test('navigation remains usable on keyboard and compact screens', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  const js = await read('app.js');
  assert.match(html, /class="skip-link" href="#top"/);
  assert.match(html, /class="mobile-menu"/);
  assert.match(html, /aria-label="Mobile navigation"/);
  assert.match(html, /aria-label="Open to signal"/);
  assert.match(css, /:where\(a, summary\):focus-visible/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(js, /removeAttribute\('open'\)/);
});

test('animation layer includes a reduced-motion path', async () => {
  const css = await read('styles.css');
  const js = await read('app.js');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /visibilitychange/);
});

test('container serves a health endpoint with a hardened nginx config', async () => {
  const dockerfile = await read('Dockerfile');
  const nginx = await read('nginx.conf');
  assert.match(dockerfile, /docker\.io\/library\/nginx:1\.27-alpine/);
  assert.match(nginx, /location = \/health/);
  assert.match(nginx, /Content-Security-Policy/);
  assert.match(nginx, /X-Content-Type-Options/);
});
