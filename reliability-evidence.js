(() => {
  const evidenceURL = '/reliability-evidence.json';
  const fallback = 'No validated reliability evidence ledger is available.';
  const states = new Set(['verified', 'bounded', 'outstanding', 'declared']);

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const isDate = (value) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
  const isURL = (value) => typeof value === 'string' && /^https?:\/\//u.test(value) && value.length <= 500;
  const validEntry = (entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    && typeof entry.id === 'string' && entry.id.length > 0 && entry.id.length <= 80
    && typeof entry.name === 'string' && entry.name.length > 0 && entry.name.length <= 120
    && states.has(entry.state)
    && typeof entry.summary === 'string' && entry.summary.length > 0 && entry.summary.length <= 500
    && isDate(entry.observed_at) && isDate(entry.source_updated_at)
    && Array.isArray(entry.source_references) && entry.source_references.length > 0 && entry.source_references.length <= 10 && entry.source_references.every(isURL)
    && Array.isArray(entry.limitations) && entry.limitations.length <= 10 && entry.limitations.every((item) => typeof item === 'string' && item.length <= 300);
  const validArtifact = (data) => data && typeof data === 'object' && !Array.isArray(data)
    && data.schema_version === 'belacca.reliability-evidence.v1'
    && data.sanitized === true
    && typeof data.generated_at === 'string' && Number.isFinite(Date.parse(data.generated_at))
    && isURL(data.source_repository)
    && Array.isArray(data.entries) && data.entries.length > 0 && data.entries.length <= 20
    && data.entries.every(validEntry);
  const formatTime = (value) => isDate(value) && value !== null
    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value))} UTC`
    : 'not observed';
  const stateLabel = (state) => state.replaceAll('_', ' ');

  const link = (reference) => {
    const anchor = document.createElement('a');
    anchor.href = reference;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = reference;
    return anchor;
  };

  const render = (data) => {
    const list = document.querySelector('[data-evidence-ledger]');
    const valid = validArtifact(data);
    if (!list) return;
    list.replaceChildren();
    if (!valid) {
      const item = document.createElement('li');
      item.textContent = fallback;
      list.append(item);
      text('[data-evidence-summary]', fallback);
      return;
    }
    text('[data-evidence-summary]', `Sanitized evidence ledger generated ${formatTime(data.generated_at)}; source revisions are linked per entry.`);
    data.entries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = `evidence-entry evidence-${entry.state}`;

      const heading = document.createElement('div');
      heading.className = 'evidence-entry-heading';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      const state = document.createElement('span');
      state.className = 'evidence-state';
      state.textContent = stateLabel(entry.state);
      heading.append(name, state);

      const summary = document.createElement('p');
      summary.textContent = entry.summary;

      const metadata = document.createElement('p');
      metadata.className = 'evidence-entry-meta';
      metadata.textContent = `observed ${formatTime(entry.observed_at)} · source updated ${formatTime(entry.source_updated_at)}`;

      const references = document.createElement('div');
      references.className = 'evidence-entry-links';
      entry.source_references.forEach((reference) => references.append(link(reference)));

      item.append(heading, summary, metadata, references);
      if (entry.limitations.length) {
        const limitations = document.createElement('p');
        limitations.className = 'evidence-entry-limitations';
        limitations.textContent = `Boundary: ${entry.limitations.join(' ')}`;
        item.append(limitations);
      }
      list.append(item);
    });
  };

  const refresh = async () => {
    try {
      const response = await fetch(`${evidenceURL}?refresh=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error(`evidence artifact HTTP ${response.status}`);
      render(await response.json());
    } catch {
      render(null);
    }
  };

  render(null);
  refresh();
})();
