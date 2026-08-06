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
  assert.match(html, /href="\/reliability\.html"/);
  const externalTargets = [...html.matchAll(/target="_blank"(.*?)>/g)].map((match) => match[1]);
  assert.ok(externalTargets.length >= 4);
  externalTargets.forEach((attrs) => assert.match(attrs, /rel="noreferrer"/));
});

test('reliability page is linked, canonical, and internally navigable', async () => {
  const html = await read('reliability.html');
  const home = await read('index.html');
  const requiredSections = ['architecture', 'delivery', 'security', 'practice', 'resilience'];
  assert.match(home, /href="\/reliability\.html"/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main id="systems-main" tabindex="-1">/);
  assert.match(html, /<h1 id="systems-title">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/francesco\.belacca\.com\/reliability\.html" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/francesco\.belacca\.com\/reliability\.html" \/>/);
  for (const id of ['systems-main', ...requiredSections]) assert.match(html, new RegExp(`(?:id|href="#")="${id}"`));
  for (const section of requiredSections) assert.match(html, new RegExp(`href="#${section}"`));
  assert.match(html, /href="\/privacy\.html"/);
});

test('reliability page meets basic keyboard and landmark expectations', async () => {
  const html = await read('reliability.html');
  const css = await read('styles.css');
  const js = await read('app.js');
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /class="skip-link" href="#systems-main"/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /aria-label="Mobile navigation"/);
  assert.match(html, /role="group" aria-label="Current request and delivery boundaries"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(css, /:where\(a, summary\):focus-visible/);
  assert.match(css, /\.reliability-shell/);
  assert.match(css, /\.reliability-disclaimer/);
  assert.match(js, /prefers-reduced-motion/);
});

test('reliability copy separates current capability from planned work', async () => {
  const html = await read('reliability.html');
  assert.match(html, /not a live status page/);
  assert.match(html, /not deployed yet/);
  assert.match(html, /candidate signals \/ not live/);
  assert.match(html, /no scheduled encrypted off-cluster backup/);
  assert.match(html, /registry SBOM and GitHub Artifact Attestation provenance/);
  assert.match(html, /no admission or Flux verification is configured/);
  assert.match(html, /GitHub Artifact Attestation provenance/);
  assert.match(html, /automatic attestation verification at reconciliation/);
  assert.match(html, /planned ≠ deployed/);
  assert.doesNotMatch(html, /99\.99%/);
  assert.doesNotMatch(html, /all systems nominal/);
  assert.doesNotMatch(html, /169\.58\.97\.73|vmi3474918|k3d-pong|10\.43\.0\.10|45371/);
  assert.doesNotMatch(html, /headlamp-google-oauth|belakkuz@gmail\.com|client_secret|private_key/);
});

test('reliability metadata is safe and build assets are packaged', async () => {
  const html = await read('reliability.html');
  const dockerfile = await read('Dockerfile');
  const workflow = await read('.github/workflows/test-and-publish.yml');
  const headers = await read('security-headers.conf');
  assert.match(html, /__BUILD_SHA__/);
  assert.match(html, /__BUILD_SHA_SHORT__/);
  assert.match(dockerfile, /COPY index\.html reliability\.html status\.html privacy\.html/);
  assert.match(dockerfile, /COPY nginx\.conf security-headers\.conf \/etc\/nginx\//);
  assert.match(dockerfile, /\/usr\/share\/nginx\/html\/index\.html \\\n      \/usr\/share\/nginx\/html\/reliability\.html/);
  assert.match(workflow, /- 'reliability\.html'/);
  assert.match(workflow, /- 'security-headers\.conf'/);
  assert.match(workflow, /docker\/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c/);
  assert.match(workflow, /actions\/attest@f7c74d28b9d84cb8768d0b8ca14a4bac6ef463e6/);
  assert.match(workflow, /subject-digest: \$\{\{ steps\.build\.outputs\.digest \}\}/);
  assert.match(workflow, /push-to-registry: true/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /sbom: true/);
  assert.match(workflow, /artifact-metadata: write/);
  assert.match(headers, /X-Content-Type-Options/);
  assert.doesNotMatch(html, /BUILD_TOKEN|API_KEY|PASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/);
});

test('public status stays unknown until a reviewed external publisher supplies data', async () => {
  const html = await read('status.html');
  const script = await read('status.js');
  const data = JSON.parse(await read('status.json'));
  const contract = JSON.parse(await read('status.schema.json'));
  assert.equal(data.schema_version, 'belacca.public-status.v1');
  assert.equal(data.sanitized, true);
  assert.equal(data.publication_state, 'not_configured');
  assert.equal(data.status, 'unknown');
  assert.equal(data.uptime.state, 'not_configured');
  assert.equal(data.uptime.value, null);
  assert.equal(contract.properties.sanitized.const, true);
  assert.match(html, /<main id="status-main" tabindex="-1">/);
  assert.match(html, /unknown \/ not configured/);
  assert.match(html, /This page makes no uptime claim/);
  assert.match(html, /No component-level status has been configured/);
  assert.match(html, /An empty incident list is not proof that no incident exists/);
  assert.match(script, /human_review/);
  assert.match(script, /valid_until/);
  assert.match(script, /Status data is unavailable or invalid/);
  assert.doesNotMatch(html, /99\.99%|all systems nominal|uptime[^<]{0,20}\d+%/i);
});

test('public status assets are packaged, linked, and not cached as live telemetry', async () => {
  const html = await read('status.html');
  const home = await read('index.html');
  const reliability = await read('reliability.html');
  const dockerfile = await read('Dockerfile');
  const nginx = await read('nginx.conf');
  const workflow = await read('.github/workflows/test-and-publish.yml');
  const sitemap = await read('sitemap.xml');
  assert.match(home, /href="\/status\.html"/);
  assert.match(reliability, /href="\/status\.html"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/francesco\.belacca\.com\/status\.html" \/>/);
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
  for (const path of ['status.html', 'status.json', 'status.js']) assert.match(nginx, new RegExp(`location = \\/${path.replace('.', '\\\.')}`));
  assert.match(nginx, /location = \/status\.json \{[\s\S]*?add_header Cache-Control "no-store"/);
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js']) assert.match(workflow, new RegExp(`- '${asset.replace('.', '\\.')}'`));
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/status\.html<\/loc>/);
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
  for (const asset of ['index.html', 'reliability.html', 'privacy.html', 'styles.css', 'app.js', 'count.js', 'favicon.svg', 'favicon.ico', 'site.webmanifest', 'robots.txt', 'llms.txt', 'sitemap.xml']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
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
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/reliability\.html<\/loc>/);
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

test('container serves a health endpoint with hardened headers and cache behavior', async () => {
  const dockerfile = await read('Dockerfile');
  const nginx = await read('nginx.conf');
  const headers = await read('security-headers.conf');
  assert.match(dockerfile, /docker\.io\/library\/nginx:1\.27-alpine/);
  assert.match(nginx, /include \/etc\/nginx\/security-headers\.conf;/);
  assert.match(nginx, /location = \/health/);
  assert.match(nginx, /location = \/reliability\.html/);
  assert.match(nginx, /add_header Cache-Control "no-store"/);
  assert.match(nginx, /add_header Cache-Control "public, max-age=3600, must-revalidate"/);
  assert.match(headers, /Content-Security-Policy/);
  assert.match(headers, /X-Content-Type-Options/);
  assert.match(headers, /X-Frame-Options/);
  assert.match(headers, /Referrer-Policy/);
  assert.match(headers, /Permissions-Policy/);
});

test('AI assistance and status boundaries are documented', async () => {
  const readme = await read('README.md');
  assert.match(readme, /read-only/);
  assert.match(readme, /evidence-linked/);
  assert.match(readme, /human approval/);
  assert.match(readme, /GitOps-only/);
  assert.match(readme, /does not collect\s+Kubernetes evidence/);
  assert.match(readme, /request Secrets/);
  assert.match(readme, /mutate a cluster/);
});

test('redirect boundary is explicit and cannot leak into the static server', async () => {
  const nginx = await read('nginx.conf');
  const readme = await read('README.md');
  assert.doesNotMatch(nginx, /return\s+30[1278]/);
  assert.match(readme, /deployment and shared host routing live in/);
  assert.match(readme, /The canonical public URL is/);
});
