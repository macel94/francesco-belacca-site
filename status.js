(() => {
  const fallback = {
    sanitized: true,
    publication_state: 'not_configured',
    status: 'unknown',
    summary: 'No external publisher has supplied a current status update.',
    updated_at: null,
    evidence_timestamp: null,
    valid_until: null,
    publisher: { name: null, source_reference: null },
    human_review: { status: 'not_configured', approved_by: null, approved_at: null },
    uptime: { state: 'not_configured', value: null, window: null, source_reference: null },
    components: [],
    incidents: [],
    source_references: [],
    notes: ['This page makes no uptime or availability claim.']
  };

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const isDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const isReferenceList = (value, required = false) => Array.isArray(value) && value.length <= 20 && (!required || value.length > 0) && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 500);
  const validComponents = (value) => Array.isArray(value) && value.length <= 20 && value.every((item) => item && typeof item === 'object' && typeof item.name === 'string' && ['operational', 'degraded', 'incident', 'unknown'].includes(item.status) && typeof item.summary === 'string' && item.summary.length <= 240 && (item.evidence_timestamp === null || isDate(item.evidence_timestamp)) && isReferenceList(item.source_references));
  const validIncidents = (value) => Array.isArray(value) && value.length <= 20 && value.every((item) => item && typeof item === 'object' && typeof item.id === 'string' && ['investigating', 'identified', 'monitoring', 'resolved'].includes(item.status) && typeof item.summary === 'string' && item.summary.length <= 240 && isDate(item.started_at) && isDate(item.updated_at) && isReferenceList(item.source_references, true));
  const validPublishedData = (data) => {
    if (!data || typeof data !== 'object') return false;
    if (data.schema_version !== 'belacca.public-status.v1' || data.sanitized !== true || data.publication_state !== 'published') return false;
    if (!['operational', 'degraded', 'incident', 'unknown'].includes(data.status)) return false;
    if (typeof data.summary !== 'string' || !data.summary || data.summary.length > 240) return false;
    if (!isDate(data.updated_at) || !isDate(data.evidence_timestamp) || !isDate(data.valid_until)) return false;
    if (Date.parse(data.valid_until) <= Date.now()) return false;
    if (!data.publisher || typeof data.publisher.name !== 'string' || !data.publisher.name || typeof data.publisher.source_reference !== 'string' || !data.publisher.source_reference) return false;
    if (!data.human_review || data.human_review.status !== 'approved' || typeof data.human_review.approved_by !== 'string' || !data.human_review.approved_by || !isDate(data.human_review.approved_at)) return false;
    if (!isReferenceList(data.source_references, true) || !validComponents(data.components) || !validIncidents(data.incidents) || !Array.isArray(data.notes) || data.notes.length > 20 || !data.notes.every((note) => typeof note === 'string' && note.length <= 500)) return false;
    if (!data.uptime || !['not_configured', 'reported'].includes(data.uptime.state)) return false;
    if (data.uptime.state === 'reported' && (typeof data.uptime.value !== 'number' || data.uptime.value < 0 || data.uptime.value > 100 || typeof data.uptime.window !== 'string' || !data.uptime.window || typeof data.uptime.source_reference !== 'string' || !data.uptime.source_reference)) return false;
    return true;
  };

  const statusLabel = (status) => ({ unknown: 'unknown', operational: 'operational', degraded: 'degraded', incident: 'incident' })[status] || 'unknown';
  const formatTime = (value) => isDate(value) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC' : 'not configured';

  const render = (data, reason = '') => {
    const safe = validPublishedData(data) ? data : fallback;
    const status = validPublishedData(data) ? statusLabel(data.status) : 'unknown';
    const panel = document.querySelector('[data-status-panel]');
    panel?.setAttribute('data-state', status);
    text('[data-status-state]', status.toUpperCase());
    text('[data-status-summary]', safe.summary);
    text('[data-status-updated]', formatTime(safe.updated_at));
    text('[data-status-evidence]', formatTime(safe.evidence_timestamp));
    text('[data-status-publisher]', safe.publisher.name || 'not configured');
    text('[data-status-review]', safe.human_review.status === 'approved' ? `approved${safe.human_review.approved_by ? ` by ${safe.human_review.approved_by}` : ''}` : 'not configured');
    text('[data-status-uptime]', safe.uptime.state === 'reported' ? `${safe.uptime.value}% / ${safe.uptime.window}` : 'not configured');
    text('[data-status-valid-until]', formatTime(safe.valid_until));
    text('[data-status-note]', reason || (validPublishedData(data) ? 'Published by an external, human-approved status publisher.' : 'No external publisher has supplied a validated status artifact.'));

    const componentList = document.querySelector('[data-status-components]');
    if (componentList) {
      componentList.replaceChildren();
      if (safe.components?.length) {
        safe.components.forEach((component) => {
          const item = document.createElement('li');
          item.textContent = `${component.name}: ${statusLabel(component.status)} — ${component.summary}`;
          componentList.append(item);
        });
      } else {
        const item = document.createElement('li');
        item.textContent = 'No component-level status has been configured.';
        componentList.append(item);
      }
    }

    const sourceList = document.querySelector('[data-status-sources]');
    if (sourceList) {
      sourceList.replaceChildren();
      if (safe.source_references?.length) {
        safe.source_references.forEach((reference) => {
          const item = document.createElement('li');
          item.textContent = reference;
          sourceList.append(item);
        });
      } else {
        const item = document.createElement('li');
        item.textContent = 'No source references have been configured.';
        sourceList.append(item);
      }
    }

    const incidentList = document.querySelector('[data-status-incidents]');
    if (incidentList) {
      incidentList.replaceChildren();
      if (safe.incidents?.length) {
        safe.incidents.forEach((incident) => {
          const item = document.createElement('li');
          item.textContent = `${incident.id}: ${incident.status} — ${incident.summary}`;
          incidentList.append(item);
        });
      } else {
        const item = document.createElement('li');
        item.textContent = 'No incident record has been supplied.';
        incidentList.append(item);
      }
    }
  };

  render(fallback);
  fetch('/status.json', { cache: 'no-store', credentials: 'omit' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`status artifact HTTP ${response.status}`)))
    .then((data) => render(data))
    .catch(() => render(fallback, 'Status data is unavailable or invalid; showing unknown / not configured.'));
})();
