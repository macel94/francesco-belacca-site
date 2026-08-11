import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFile(resolve(root, file), 'utf8');
const readBytes = (file) => readFile(resolve(root, file));

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
  const caddy = await read('Caddyfile');
  assert.match(html, /data-goatcounter="\/count" async src="\/count\.js"/);
  assert.match(html, /href="\/privacy\.html"/);
  assert.match(privacy, /self-hosted analytics/);
  assert.match(privacy, /does not use advertising trackers/);
  assert.match(tracker, /GoatCounter/);
  assert.doesNotMatch(tracker, /gc\.zgo\.at|zgo\.at\/count/);
  assert.match(caddy, /@count path \/count/);
  assert.match(caddy, /goatcounter\.analytics\.svc\.cluster\.local/);
  assert.match(caddy, /header_up Host stats\.belacca\.com/);
  assert.match(caddy, /preserves and appends X-Forwarded-For by default/);
  assert.match(caddy, /header_up X-Real-IP \{remote_host\}/);
  assert.match(caddy, /@countjs path \/count\.js/);
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
  assert.match(html, /policy and evidence pipeline exists/);
  assert.match(html, /complete valid rolling 30-day measured window/);
  assert.match(html, /30-day SLO values remain [^<]*not reportable/);
  assert.match(html, /external journeys \/ current/);
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

test('public reliability claims identify evidence limits and unproven objectives', async () => {
  const html = await read('reliability.html');
  const readme = await read('README.md');
  const documents = [html, readme];
  const markers = [
    /policy and evidence pipeline exists/,
    /complete valid rolling 30-day measured\s+(?:window|history)/,
    /30-day SLO values remain\s+not\s+reportable/,
    /external user-journey checks now cover the portfolio, Pong, and analytics\s+collector/i,
    /authenticated dashboard checks remain unconfigured/i,
    /Native Prometheus is private diagnostic\s+telemetry/,
    /not external availability proof/,
    /99%[\s\S]{0,120}internal objective, not an SLA/,
    /no paging destination is provisioned/i,
    /off-cluster backup/,
    /health-aware failover/,
    /real failure drills are claimed/,
    /controlled-drill recovery P95 under six minutes remains unproven/
  ];
  for (const document of documents) {
    for (const marker of markers) assert.match(document, marker);
  }
});

test('reliability metadata is safe and build assets are packaged', async () => {
  const html = await read('reliability.html');
  const dockerfile = await read('Dockerfile');
  const workflow = await read('.github/workflows/test-and-publish.yml');
  const caddy = await read('Caddyfile');
  assert.match(html, /__BUILD_SHA__/);
  assert.match(html, /__BUILD_SHA_SHORT__/);
  assert.match(dockerfile, /COPY index\.html reliability\.html status\.html privacy\.html/);
  assert.match(dockerfile, /COPY Caddyfile \/etc\/caddy\/Caddyfile/);
  assert.match(dockerfile, /\/srv\/index\.html/);
  assert.match(workflow, /- 'reliability\.html'/);
  assert.match(workflow, /- 'Caddyfile'/);
  assert.match(workflow, /docker\/setup-buildx-action@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/attest@[0-9a-f]{40}/);
  assert.match(workflow, /subject-digest: \$\{\{ steps\.build\.outputs\.digest \}\}/);
  assert.match(workflow, /push-to-registry: true/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /sbom: true/);
  assert.match(workflow, /artifact-metadata: write/);
  assert.match(caddy, /X-Content-Type-Options/);
  assert.doesNotMatch(html, /BUILD_TOKEN|API_KEY|PASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/);
});

test('public status stays unknown until a fresh automated external observation supplies data', async () => {
  const html = await read('status.html');
  const script = await read('status.js');
  const data = JSON.parse(await read('status.json'));
  const contract = JSON.parse(await read('status.schema.json'));
  assert.equal(data.schema_version, 'belacca.public-status.v2');
  assert.equal(data.sanitized, true);
  assert.equal(data.publication_state, 'not_configured');
  assert.equal(data.status, 'unknown');
  assert.equal(data.observation_id, null);
  assert.equal(data.monitoring_policy, null);
  assert.equal(data.uptime.state, 'not_configured');
  assert.equal(data.uptime.value, null);
  assert.equal(contract.properties.sanitized.const, true);
  assert.match(html, /<main id="status-main" tabindex="-1">/);
  assert.match(html, /unknown/);
  assert.match(html, /This page never infers health from its own response/);
  assert.match(html, /hourly external observation/);
  assert.match(html, /native cluster/);
  assert.match(script, /monitoring_policy/);
  assert.match(script, /valid_until/);
  assert.match(script, /Status data is unavailable or invalid/);
  assert.match(script, /const remoteStatusURL = 'https:\/\/raw\.githubusercontent\.com\/macel94\/belacca-status\/main\/status\.json'/);
  assert.doesNotMatch(script, /slo\.json/);
  assert.doesNotMatch(html, /99\.99%|all systems nominal|uptime[^<]{0,20}\d+%/i);
});

test('public status assets are packaged, linked, and not cached as live telemetry', async () => {
  const html = await read('status.html');
  const home = await read('index.html');
  const reliability = await read('reliability.html');
  const dockerfile = await read('Dockerfile');
  const caddy = await read('Caddyfile');
  const workflow = await read('.github/workflows/test-and-publish.yml');
  const sitemap = await read('sitemap.xml');
  assert.match(home, /href="\/status\.html"/);
  assert.match(reliability, /href="\/status\.html"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/francesco\.belacca\.com\/status\.html" \/>/);
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
  for (const path of ['status.html', 'status.json', 'status.js']) assert.match(caddy, new RegExp(`path \\/${path.replace('.', '\\\.')}`));
  assert.match(caddy, /@statusjson path \/status\.json[\s\S]*?header @statusjson Cache-Control "no-store"/);
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js']) assert.match(workflow, new RegExp(`- '${asset.replace('.', '\\.')}'`));
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/status\.html<\/loc>/);
});

test('work section features the requested projects', async () => {
  const html = await read('index.html');
  assert.match(html, /href="https:\/\/github\.com\/macel94\/belacca-platform"/);
  assert.match(html, /Belacca Platform/);
  assert.match(html, /native-k3s GitOps platform with external 99%\/30d SLO evidence/);
  assert.match(html, /href="https:\/\/github\.com\/macel94\/eu-azfoundry-scout"/);
  assert.match(html, /EU Azure Foundry Scout/);
  assert.match(html, /bounded aggregate telemetry/);
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
  for (const document of ['index.html', 'privacy.html', 'reliability.html', 'status.html']) {
    const documentHtml = await read(document);
    assert.match(documentHtml, /href="\/favicon\.svg" type="image\/svg\+xml"/);
    assert.match(documentHtml, /href="\/favicon\.ico" type="image\/x-icon" sizes="16x16 32x32 48x48"/);
    assert.match(documentHtml, /rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"/);
  }
  assert.match(html, /href="\/site\.webmanifest"/);
  for (const asset of ['index.html', 'reliability.html', 'privacy.html', 'styles.css', 'app.js', 'count.js', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'robots.txt', 'llms.txt', 'sitemap.xml']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
  assert.match(dockerfile, /ARG BUILD_SHA=dev/);
  assert.match(dockerfile, /__BUILD_SHA_SHORT__/);
  assert.match(manifest, /"start_url": "\/"/);
  assert.match(manifest, /"theme_color": "#030507"/);
  assert.match(manifest, /"src": "\/icon-192\.png"/);
  assert.match(manifest, /"src": "\/icon-512\.png"/);
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Sitemap: https:\/\/francesco\.belacca\.com\/sitemap\.xml/);
  assert.match(llms, /^# Francesco Belacca/m);
  assert.match(llms, /https:\/\/github\.com\/macel94\/eu-azfoundry-scout/);
  assert.match(llms, /https:\/\/github\.com\/macel94\/postquantumdotnettest/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/privacy\.html<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/francesco\.belacca\.com\/reliability\.html<\/loc>/);
});

test('favicon binaries use browser-safe square dimensions', async () => {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngDimensions = async (file, expected) => {
    const bytes = await readBytes(file);
    assert.deepEqual(bytes.subarray(0, 8), pngSignature);
    assert.equal(bytes.readUInt32BE(16), expected);
    assert.equal(bytes.readUInt32BE(20), expected);
    assert.equal(bytes[24], 8);
    assert.equal(bytes[25], 6);
  };

  await pngDimensions('apple-touch-icon.png', 180);
  await pngDimensions('icon-192.png', 192);
  await pngDimensions('icon-512.png', 512);

  const ico = await readBytes('favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    assert.equal(ico.readUInt16LE(entry + 4), 1);
    assert.equal(ico.readUInt16LE(entry + 6), 32);
    const payloadOffset = ico.readUInt32LE(entry + 12);
    assert.deepEqual(ico.subarray(payloadOffset, payloadOffset + 8), pngSignature);
    assert.equal(ico.readUInt32BE(payloadOffset + 16), size);
    assert.equal(ico.readUInt32BE(payloadOffset + 20), size);
  }
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

test('animated layers redraw cleanly and keep the marquee seamless', async () => {
  const html = await read('index.html');
  const css = await read('styles.css');
  const js = await read('app.js');
  const groups = [...html.matchAll(/<div class="marquee-group"(?: aria-hidden="true")?>([\s\S]*?)<\/div>/g)].map((match) => match[1]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0], groups[1]);
  assert.match(html, /<section class="marquee" aria-hidden="true">[\s\S]*<div class="marquee-track">/);
  assert.match(html, /<div class="marquee-group" aria-hidden="true">/);

  const marqueeRule = css.match(/\.marquee\s*\{[^}]*\}/s)?.[0];
  const trackRule = css.match(/\.marquee-track\s*\{[^}]*\}/s)?.[0];
  const groupRule = css.match(/\.marquee-group\s*\{[^}]*\}/s)?.[0];
  assert.ok(marqueeRule);
  assert.ok(trackRule);
  assert.ok(groupRule);
  assert.match(marqueeRule, /overflow:\s*hidden/);
  assert.match(marqueeRule, /color:\s*var\(--green(?:-neon)?\)/);
  assert.match(trackRule, /width:\s*max-content/);
  assert.match(trackRule, /animation:\s*marquee\s+[^;]*linear\s+infinite/);
  assert.match(groupRule, /font:\s*[^;]*var\(--mono\)/);
  assert.match(css, /@keyframes marquee\s*\{[^}]*translateX\(-50%\)/s);

  const drawStart = js.indexOf('const draw = () =>');
  const draw = js.slice(drawStart, js.indexOf('  window.addEventListener', drawStart));
  assert.match(draw, /context\.clearRect\(0, 0, width, height\);/);
  assert.ok(draw.indexOf('clearRect') < draw.indexOf('fillText'));
  assert.match(draw, /if \(isVisible\) \{/);
  assert.doesNotMatch(draw, /context\.fillRect/);
  assert.doesNotMatch(draw, /rgba\(3,\s*5,\s*7/);
});

test('container serves a health endpoint with hardened headers and cache behavior', async () => {
  const dockerfile = await read('Dockerfile');
  const caddy = await read('Caddyfile');
  assert.match(dockerfile, /docker\.io\/library\/caddy:2\.10\.2-alpine/);
  assert.match(caddy, /@health path \/health/);
  assert.match(caddy, /@reliability path \/reliability\.html/);
  assert.match(caddy, /header @statushtml Cache-Control "no-store"/);
  assert.match(caddy, /header @styles Cache-Control "public, max-age=3600, must-revalidate"/);
  assert.match(caddy, /Content-Security-Policy/);
  assert.match(caddy, /X-Content-Type-Options/);
  assert.match(caddy, /X-Frame-Options/);
  assert.match(caddy, /Referrer-Policy/);
  assert.match(caddy, /Permissions-Policy/);
  assert.match(caddy, /connect-src 'self' https:\/\/raw\.githubusercontent\.com/);
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
  const caddy = await read('Caddyfile');
  const readme = await read('README.md');
  assert.doesNotMatch(caddy, /redir\s+30[1278]/);
  assert.match(readme, /deployment and shared host routing live in/);
  assert.match(readme, /The canonical public URL is/);
});
