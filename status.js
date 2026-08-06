(() => {
  const remoteStatusURL = 'https://raw.githubusercontent.com/macel94/belacca-status/main/status.json';
  const refreshIntervalMs = 5 * 60 * 1000;
  const fallback = {
    sanitized: true,
    publication_state: 'not_configured',
    status: 'unknown',
    summary: 'No fresh external status observation is available.',
    observation_id: null,
    observed_at: null,
    updated_at: null,
    evidence_timestamp: null,
    valid_until: null,
    publisher: { name: null, source_reference: null },
    monitoring_policy: null,
    uptime: { state: 'not_configured', value: null, window: null, source_reference: null },
    components: [],
    incidents: [],
    source_references: [],
    notes: ['This page makes no uptime or availability claim without fresh external evidence.']
  };

  let lastPublishedData = null;
  let refreshTimer = null;

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const isDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const isReferenceList = (value, required = false) => Array.isArray(value) && value.length <= 20 && (!required || value.length > 0) && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 500);
  const isStatus = (value) => ['operational', 'degraded', 'incident', 'unknown'].includes(value);
  const validComponent = (item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length <= 80 && typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 100 && typeof item.critical === 'boolean' && isStatus(item.status) && typeof item.summary === 'string' && item.summary.length > 0 && item.summary.length <= 240 && isDate(item.evidence_timestamp) && Number.isInteger(item.duration_ms) && item.duration_ms >= 0 && item.duration_ms <= 120000 && isReferenceList(item.source_references, true);
  const validIncident = (item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 100 && ['investigating', 'identified', 'monitoring', 'resolved'].includes(item.status) && typeof item.summary === 'string' && item.summary.length > 0 && item.summary.length <= 240 && isDate(item.started_at) && isDate(item.updated_at) && isReferenceList(item.source_references, true);
  const validPublishedData = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    if (data.schema_version !== 'belacca.public-status.v2' || data.sanitized !== true || data.publication_state !== 'published') return false;
    if (!isStatus(data.status) || typeof data.summary !== 'string' || !data.summary || data.summary.length > 240) return false;
    if (typeof data.observation_id !== 'string' || !data.observation_id || data.observation_id.length > 120) return false;
    if (!isDate(data.observed_at) || !isDate(data.updated_at) || !isDate(data.evidence_timestamp) || !isDate(data.valid_until)) return false;
    if (Date.parse(data.valid_until) <= Date.now()) return false;
    if (!data.publisher || typeof data.publisher.name !== 'string' || !data.publisher.name || data.publisher.name.length > 120 || typeof data.publisher.source_reference !== 'string' || !data.publisher.source_reference) return false;
    const policy = data.monitoring_policy;
    if (!policy || typeof policy.id !== 'string' || !policy.id || typeof policy.approved_by !== 'string' || !policy.approved_by || !isDate(policy.approved_at) || typeof policy.runner !== 'string' || !policy.runner || typeof policy.interval !== 'string' || !policy.interval || typeof policy.freshness_ttl !== 'string' || !policy.freshness_ttl || !Number.isInteger(policy.failure_threshold) || !Number.isInteger(policy.recovery_threshold)) return false;
    if (!data.uptime || !['not_configured', 'reported'].includes(data.uptime.state)) return false;
    if (data.uptime.state === 'reported' && (typeof data.uptime.value !== 'number' || data.uptime.value < 0 || data.uptime.value > 100 || typeof data.uptime.window !== 'string' || !data.uptime.window || typeof data.uptime.source_reference !== 'string' || !data.uptime.source_reference)) return false;
    if (!Array.isArray(data.components) || data.components.length === 0 || data.components.length > 20 || !data.components.every(validComponent)) return false;
    if (!Array.isArray(data.incidents) || data.incidents.length > 20 || !data.incidents.every(validIncident)) return false;
    if (!isReferenceList(data.source_references, true) || !Array.isArray(data.notes) || data.notes.length > 20 || !data.notes.every((note) => typeof note === 'string' && note.length <= 500)) return false;
    return true;
  };

  const statusLabel = (status) => ({ unknown: 'unknown', operational: 'operational', degraded: 'degraded', incident: 'incident' })[status] || 'unknown';
  const formatTime = (value) => isDate(value) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC' : 'not configured';
  const safeReference = (value) => typeof value === 'string' && /^https?:\/\//u.test(value) && value.length <= 500;

  const appendReference = (list, reference) => {
    const item = document.createElement('li');
    if (safeReference(reference)) {
      const link = document.createElement('a');
      link.href = reference;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = reference;
      item.append(link);
    } else {
      item.textContent = reference;
    }
    list.append(item);
  };

  const render = (data, reason = '') => {
    const published = validPublishedData(data);
    const safe = published ? data : fallback;
    const status = published ? statusLabel(data.status) : 'unknown';
    const panel = document.querySelector('[data-status-panel]');
    panel?.setAttribute('data-state', status);
    text('[data-status-state]', status.toUpperCase());
    text('[data-status-summary]', safe.summary);
    text('[data-status-updated]', formatTime(safe.updated_at));
    text('[data-status-evidence]', formatTime(safe.evidence_timestamp));
    text('[data-status-publisher]', safe.publisher.name || 'not configured');
    text('[data-status-review]', safe.monitoring_policy?.approved_by ? `policy approved by ${safe.monitoring_policy.approved_by}` : 'not configured');
    text('[data-status-uptime]', safe.uptime.state === 'reported' ? `${safe.uptime.value}% / ${safe.uptime.window}` : 'not configured');
    text('[data-status-valid-until]', formatTime(safe.valid_until));
    text('[data-status-observation]', safe.observation_id || 'not configured');
    text('[data-status-note]', reason || (published ? 'Automated external evidence published under a human-approved monitoring policy.' : 'No fresh external publisher has supplied a validated status artifact.'));

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
      if (safe.source_references?.length) safe.source_references.forEach((reference) => appendReference(sourceList, reference));
      else {
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

  const refresh = async () => {
    try {
      const response = await fetch(`${remoteStatusURL}?refresh=${Date.now()}`, { cache: 'no-store', credentials: 'omit', mode: 'cors' });
      if (!response.ok) throw new Error(`status artifact HTTP ${response.status}`);
      const data = await response.json();
      if (!validPublishedData(data)) throw new Error('status artifact is invalid or expired');
      lastPublishedData = data;
      render(data);
    } catch {
      if (lastPublishedData && validPublishedData(lastPublishedData)) render(lastPublishedData, 'Live refresh is unavailable; showing the last fresh external observation.');
      else render(fallback, 'Status data is unavailable or invalid; showing unknown / not configured.');
    }
  };

  render(fallback);
  refresh();
  refreshTimer = window.setInterval(refresh, refreshIntervalMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  window.addEventListener('pagehide', () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
  }, { once: true });
})();
