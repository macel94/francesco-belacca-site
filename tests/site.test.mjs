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
  assert.match(html, /href="__BUILD_RUN_URL__"/);
  assert.match(html, /__BUILD_SHA__/);
  assert.match(html, /__BUILD_SHA_SHORT__/);
  assert.match(html, /https:\/\/francesco\.belacca\.com\//);
  assert.match(html, /Cloud Native Pong/);
  assert.match(html, /mailto:francesco\.belacca@hotmail\.it/);
});

test('each public page exposes the build run link', async () => {
  for (const file of ['index.html', 'reliability.html', 'status.html']) {
    const html = await read(file);
    const links = [...html.matchAll(/<a class="build-version" href="([^"]+)"[^>]*>build <code>([^<]+)<\/code>/g)];
    assert.equal(links.length, 1, `${file} should expose one build link`);
    assert.equal(links[0][1], '__BUILD_RUN_URL__');
    assert.equal(links[0][2], '__BUILD_SHA_SHORT__');
    assert.match(links[0][0], /__BUILD_SHA__/);
  }
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
  assert.match(caddy, /handle @count\s+\{\s+reverse_proxy goatcounter\.analytics\.svc\.cluster\.local/s);
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
  assert.match(html, /external monitoring path publishes/);
  assert.match(html, /current service levels are calculated from the good and bad observations already available/i);
  assert.match(html, /sanitized evidence ledger/);
  assert.match(html, /latest rolling 30-day window/);
  assert.doesNotMatch(html, /30-day SLO values remain [^<]*not reportable/);
  assert.match(html, /external journeys \/ current/);
  assert.match(html, /Recovery evidence is bounded/);
  assert.match(html, /data-evidence-ledger/);
  assert.match(html, /reliability-evidence\.js/);
  assert.match(html, /registry SBOM and GitHub Artifact Attestation provenance/);
  assert.match(html, /no admission or Flux verification is configured/);
  assert.match(html, /GitHub Artifact Attestation provenance/);
  assert.match(html, /automatic attestation verification at reconciliation/);
  assert.match(html, /planned ≠ deployed/);
  assert.doesNotMatch(html, /99\.99%/);
  assert.doesNotMatch(html, /all systems nominal/);
  assert.match(html, /native production|status\.json|slo\.json/u);
  assert.match(html, /data-slo-services/);
  assert.match(html, /reliability\.js/);
  assert.doesNotMatch(html, /headlamp-google-oauth|belakkuz@gmail\.com|client_secret|private_key/);
});

test('public reliability claims identify evidence limits and unproven objectives', async () => {
  const html = await read('reliability.html');
  const readme = await read('README.md');
  const documents = [html, readme];
  const markers = [
    /(?:policy and evidence pipeline exists|external monitoring path publishes)/,
    /external monitoring path (?:is live|publishes)/,
    /current service levels are calculated from the good and bad observations already available/i,
    /latest rolling 30-day window/i,
    /external user-journey checks now cover the portfolio, Pong, and analytics\s+collector/i,
    /authenticated dashboard checks await a reviewed synthetic identity/i,
    /Native Prometheus is private diagnostic\s+telemetry/,
    /not external availability proof/,
    /99%[\s\S]{0,120}internal objective, not an SLA/,
    /Alertmanager[\s\S]{0,160}Telegram/i,
    /off-cluster (?:AWS )?backup/,
    /evidence ledger|reliability evidence ledger/i,
    /backup|notification|configuration claims/i,
    /health-aware failover/,
    /real failure drills remain separate follow-up work|real failure drills remain unclaimed/,
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
  assert.match(html, /href="__BUILD_RUN_URL__"/);
  assert.match(dockerfile, /ARG BUILD_RUN_ID=local/);
  assert.match(dockerfile, /__BUILD_RUN_URL__/);
  assert.match(dockerfile, /actions\/runs/);
  assert.match(workflow, /BUILD_RUN_ID=\$\{\{ github\.run_id \}\}/);
  assert.match(dockerfile, /COPY index\.html reliability\.html reliability\.js reliability-evidence\.js reliability-evidence\.json reliability-evidence\.schema\.json status\.html privacy\.html/);
  assert.match(dockerfile, /COPY Caddyfile \/etc\/caddy\/Caddyfile/);
  assert.match(dockerfile, /\/srv\/index\.html/);
  assert.match(workflow, /- 'reliability\.html'/);
  assert.match(workflow, /- 'reliability\.js'/);
  assert.match(workflow, /- 'Caddyfile'/);
  assert.match(workflow, /docker\/setup-buildx-action@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/attest@[0-9a-f]{40}/);
  assert.match(workflow, /subject-digest: \$\{\{ steps\.image\.outputs\.digest \}\}/);
  assert.match(workflow, /image-ref: \$\{\{ steps\.image\.outputs\.reference \}\}/);
  assert.match(workflow, /scanners: vuln/);
  assert.match(workflow, /Upload scan evidence/);
  assert.match(workflow, /predicate-type: https:\/\/belacca\.com\/attestations\/vulnerability\/v1/);
  assert.match(workflow, /predicate-path: francesco-belacca-site\.vulnerability-decision\.json/);
  assert.match(workflow, /native-production-v1 promotion blocked/);
  assert.match(workflow, /IMAGE_DIGEST: \$\{\{ steps\.image\.outputs\.digest \}\}/);
  assert.match(workflow, /Record deployed immutable image/);
  assert.match(workflow, /push-to-registry: true/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /sbom: true/);
  assert.match(workflow, /artifact-metadata: write/);
  assert.match(caddy, /X-Content-Type-Options/);
  assert.doesNotMatch(html, /BUILD_TOKEN|API_KEY|PASSWORD|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/);
});

test('reliability evidence ledger is sanitized, bounded, and source-linked', async () => {
  const evidence = JSON.parse(await read('reliability-evidence.json'));
  const schema = JSON.parse(await read('reliability-evidence.schema.json'));
  const validator = await read('scripts/validate-reliability-evidence.mjs');
  const reliability = await read('reliability.html');
  const renderer = await read('reliability-evidence.js');
  assert.equal(evidence.schema_version, 'belacca.reliability-evidence.v1');
  assert.equal(evidence.sanitized, true);
  assert.equal(schema.properties.schema_version.const, 'belacca.reliability-evidence.v1');
  assert.ok(evidence.entries.some((entry) => entry.id === 'backup-upload-restore' && entry.state === 'verified'));
  assert.ok(evidence.entries.some((entry) => entry.id === 'backup-retention' && entry.state === 'outstanding'));
  assert.ok(evidence.entries.some((entry) => entry.id === 'notification-routing' && entry.state === 'bounded'));
  assert.ok(evidence.entries.some((entry) => entry.id === 'portfolio-replicas' && entry.state === 'declared'));
  assert.match(reliability, /id="evidence"/);
  assert.match(reliability, /data-evidence-ledger/);
  assert.match(renderer, /reliability-evidence\.json/);
  assert.match(validator, /source-linked, bounded/);
  assert.doesNotMatch(JSON.stringify(evidence), /token|password|private[_ -]?key|player|room[_ -]?id|127\.0\.0\.1/i);
});

test('reliability SLO surface renders measured history without becoming current status', async () => {
  const html = await read('reliability.html');
  const script = await read('reliability.js');
  assert.match(html, /id="measurements"/);
  assert.match(html, /data-slo-services/);
  assert.match(html, /good observations \/ \(good \+ bad observations\)/);
  assert.match(script, /belacca-status\/main\/slo\.json/);
  assert.match(script, /available_history/);
  assert.match(script, /rolling_30d/);
  assert.match(script, /observed_slots/);
  assert.doesNotMatch(script, /innerHTML\s*=\s*service\.(?:name|id)/);
});

test('public status uses a freshness-safe fallback and measured uptime contract', async () => {
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
  assert.match(html, /Recovery is documented elsewhere/);
  assert.match(html, /reliability evidence ledger/);
  assert.doesNotMatch(html, /Backups are verified/);
  assert.match(html, /unknown/);
  assert.doesNotMatch(html, /not configured/);
  assert.match(html, /never infers health from its own response/);
  assert.match(html, /hourly external observation/);
  assert.match(html, /native cluster/);
  assert.match(script, /monitoring_policy/);
  assert.match(script, /valid_until/);
  assert.match(script, /Status data is unavailable or invalid/);
  assert.match(script, /const localStatusURL = '\/status\.json'/);
  assert.match(script, /validBootstrapData/);
  assert.match(script, /checked-in artifact confirms an unknown state/);
  assert.match(script, /const remoteStatusURL = 'https:\/\/raw\.githubusercontent\.com\/macel94\/belacca-status\/main\/status\.json'/);
  assert.doesNotMatch(script, /slo\.json/);
  assert.doesNotMatch(html, /99\.99%|all systems nominal/i);
  assert.match(script, /safe\.uptime\.window/);
  assert.match(script, /safe\.uptime\.observations/);
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
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js', 'reliability-evidence.js', 'reliability-evidence.json', 'reliability-evidence.schema.json']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
  for (const path of ['status.html', 'status.json', 'status.js', 'reliability-evidence.json', 'reliability-evidence.js']) assert.match(caddy, new RegExp(`path \\/${path.replace('.', '\\\.')}`));
  assert.match(caddy, /@statusjson path \/status\.json[\s\S]*?header @statusjson Cache-Control "no-store"/);
  for (const asset of ['status.html', 'status.json', 'status.schema.json', 'status-contract.md', 'status.js', 'reliability-evidence.js', 'reliability-evidence.json', 'reliability-evidence.schema.json']) assert.match(workflow, new RegExp(`- '${asset.replace('.', '\\.')}'`));
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
  for (const asset of ['index.html', 'reliability.html', 'reliability.js', 'privacy.html', 'styles.css', 'app.js', 'count.js', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'robots.txt', 'llms.txt', 'sitemap.xml']) assert.match(dockerfile, new RegExp(asset.replace('.', '\\.'), 'u'));
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
  assert.match(html, /aria-label="Contact Francesco"/);
  assert.match(css, /:where\(a, summary\):focus-visible/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(js, /removeAttribute\('open'\)/);
});

test('hamburger headers use a non-overlapping mobile-only arrangement', async () => {
  const css = await read('styles.css');
  assert.match(css, /\.site-header \{ display: flex;/);
  assert.match(css, /@media \(max-width: 650px\) \{ \.mobile-header \{ display: grid; grid-template-columns: minmax\(0, 1fr\) auto; grid-template-areas: "brand status" "build menu";/);
  assert.match(css, /\.mobile-header \.header-right \{ display: contents; \}/);
  assert.match(css, /\.mobile-header \.build-version \{ grid-area: build;/);
  assert.match(css, /\.mobile-header \.status-pill \{ grid-area: status;/);
  assert.match(css, /\.mobile-header \.mobile-menu \{ grid-area: menu;/);

  for (const file of ['index.html', 'reliability.html', 'status.html']) {
    const html = await read(file);
    assert.match(html, /<header class="site-header mobile-header">/);
  }
});

test('animation layer includes a reduced-motion path', async () => {
  const css = await read('styles.css');
  const js = await read('app.js');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
});

test('animated layers stay visible, multi-character, and reduced-motion aware', async () => {
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

  assert.match(html, /<canvas class="matrix-canvas" id="matrix-canvas" aria-hidden="true"><\/canvas>/);
  assert.doesNotMatch(html, /matrix-column/);
  assert.match(js, /getElementById\('matrix-canvas'\)/);
  assert.match(js, /const chars = '[^']{100,}'/);
  assert.match(js, /const fontSize = 16/);
  assert.match(js, /const trailLength = 15/);
  assert.match(js, /const targetFPS = 24/);
  assert.match(js, /canvas\.width = window\.innerWidth/);
  assert.match(js, /canvas\.height = window\.innerHeight/);
  assert.match(js, /ctx\.fillStyle = '#000000'/);
  assert.match(js, /ctx\.fillStyle = j === 0/);
  assert.match(js, /requestAnimationFrame\(drawMatrix\)/);
  assert.match(js, /window\.addEventListener\('resize', initMatrix\)/);

  const bodyRule = css.match(/body\s*\{[^}]*\}/s)?.[0];
  const canvasRule = css.match(/#matrix-canvas\s*\{[^}]*\}/s)?.[0];
  const noiseRule = css.match(/\.noise\s*\{[^}]*\}/s)?.[0];
  const shellRule = css.match(/\.shell\s*\{[^}]*\}/s)?.[0];
  assert.ok(bodyRule);
  assert.ok(canvasRule);
  assert.ok(noiseRule);
  assert.ok(shellRule);
  assert.match(bodyRule, /isolation:\s*isolate/);
  assert.match(canvasRule, /position:\s*fixed/);
  assert.match(canvasRule, /top:\s*0/);
  assert.match(canvasRule, /left:\s*0/);
  assert.match(canvasRule, /z-index:\s*0/);
  assert.match(canvasRule, /pointer-events:\s*none/);
  assert.match(canvasRule, /opacity:\s*\.31/);
  assert.match(noiseRule, /z-index:\s*1/);
  assert.match(noiseRule, /pointer-events:\s*none/);
  assert.match(shellRule, /z-index:\s*2/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*#matrix-canvas, \.marquee-track \{ display: none; \}/);
  assert.match(js, /!prefersReducedMotion/);
});

test('portfolio SLO contract defines the durable user-journey measurement', async () => {
  const slo = JSON.parse(await read('portfolio-slo.json'));
  const schema = JSON.parse(await read('portfolio-slo.schema.json'));
  const readme = await read('README.md');
  const reliability = await read('reliability.html');
  assert.equal(slo.schema_version, 'belacca.portfolio-slo.v1');
  assert.equal(slo.objective.target, 0.99);
  assert.equal(slo.objective.window, '30d');
  assert.equal(slo.objective.classification, 'internal_objective');
  assert.equal(slo.objective.sla, false);
  assert.equal(slo.measurement.state, 'measured');
  assert.equal(slo.measurement.measurement_window, 'available_history');
  assert.equal(slo.measurement.build_metadata_is_evidence, false);
  assert.equal(slo.sli.id, 'portfolio_user_journey_availability');
  assert.equal(slo.sli.calculation, 'good_events / total_events');
  assert.deepEqual(slo.sli.checks.map(({ id, path }) => ({ id, path })), [{ id: 'health', path: '/health' }, { id: 'homepage', path: '/' }]);
  assert.equal(slo.journey_assertions.path_and_query_preserved, true);
  assert.equal(slo.dependency_policy.primary_availability_impact, 'excluded');
  assert.equal(slo.freshness_policy.build_identifier_role.includes('never availability evidence'), true);
  assert.equal(slo.rollback.validator, 'scripts/gitops-rollback-check.sh');
  assert.equal(schema.properties.objective.properties.target.const, 0.99);
  assert.match(readme, /durable portfolio SLO contract/);
  assert.match(reliability, /portfolio SLI contract and external probe cover the health and homepage journey/);
  assert.match(reliability, /analytics failure is excluded from the primary event/);
  assert.doesNotMatch(JSON.stringify(slo), /__BUILD_SHA|BUILD_RUN_ID|uptime/i);
});

test('vulnerability decision generator is packaged and fail-closed', async () => {
  const script = await read('scripts/create-vulnerability-decision.mjs');
  const reliability = await read('reliability.html');
  const decisionTests = await read('tests/vulnerability-decision.test.mjs');
  assert.match(script, /native-production-v1/);
  const vex = await read('security/site.openvex.json');
  assert.match(script, /knownUnfixed/);
  assert.match(vex, /GO-2026-5932/);
  assert.match(vex, /vulnerable_code_not_present/);
  assert.match(reliability, /vulnerability-decision|Measured/);
  assert.match(decisionTests, /fixed medium findings remain promotable/);
  assert.match(decisionTests, /high, critical, and any other known-unfixed/);
});

test('synthetic and rollback validators are fail-closed and deterministic', async () => {
  const synthetic = await read('scripts/synthetic-check.sh');
  const runtime = await read('scripts/runtime-check.sh');
  const rollback = await read('scripts/gitops-rollback-check.sh');
  assert.match(synthetic, /REQUIRE_SYNTHETIC/);
  assert.match(synthetic, /Cache-Control/);
  assert.match(synthetic, /SYNTHETIC_ALIAS_URLS/);
  assert.match(synthetic, /path\/query/);
  assert.match(runtime, /failing analytics upstream/);
  assert.match(runtime, /\/health and \/ remain healthy/);
  assert.match(runtime, /expected fixture 503/);
  assert.match(runtime, /chmod 0644/);
  assert.match(runtime, /fault-server did not answer its local health probe/);
  assert.match(runtime, /site container exited before publishing its port/);
  assert.match(rollback, /git revert/);
  assert.match(rollback, /deploy\/kustomization\.yaml/);
  assert.match(rollback, /operator-run production drill/);
  for (const script of [synthetic, runtime, rollback]) assert.doesNotMatch(script, /kubectl apply|flux reconcile|gh auth login/);
});

test('container serves a health endpoint with hardened headers and cache behavior', async () => {
  const dockerfile = await read('Dockerfile');
  const caddy = await read('Caddyfile');
  assert.match(dockerfile, /docker\.io\/library\/caddy:2\.11\.4-alpine@sha256:[0-9a-f]{64}/);
  assert.match(caddy, /@health path \/health/);
  assert.match(caddy, /@homepage path \/\s+header @homepage Cache-Control "no-cache, must-revalidate"/);
  assert.match(caddy, /@reliability path \/reliability\.html/);
  assert.match(caddy, /header @statushtml Cache-Control "no-store"/);
  assert.match(caddy, /header @styles Cache-Control "public, max-age=3600, must-revalidate"/);
  assert.match(caddy, /Content-Security-Policy/);
  assert.match(caddy, /X-Content-Type-Options/);
  assert.match(caddy, /X-Frame-Options/);
  assert.match(caddy, /Referrer-Policy/);
  assert.match(caddy, /Permissions-Policy/);
  assert.match(caddy, /connect-src 'self' https:\/\/raw\.githubusercontent\.com/);
  assert.match(await read('deploy/kustomization.yaml'), /newTag: sha-[0-9a-f]{40}\n\s+digest: sha256:[0-9a-f]{64}/);
  assert.match(dockerfile, /COPY [^\n]*portfolio-slo\.json portfolio-slo\.schema\.json/);
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
