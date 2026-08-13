(() => {
  const remoteSloURL = 'https://raw.githubusercontent.com/macel94/belacca-status/main/slo.json';
  const fallback = {
    summary: 'No measured service-level observations are available.',
    services: [],
  };

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const isDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
  const validService = (service) => service && typeof service === 'object'
    && typeof service.id === 'string'
    && typeof service.name === 'string'
    && ['measured', 'reportable'].includes(service.state)
    && ['available_history', 'rolling_30d'].includes(service.measurement_window)
    && service.counts && Number.isInteger(service.counts.expected_slots)
    && Number.isInteger(service.counts.observed_slots)
    && Number.isInteger(service.counts.good_slots)
    && Number.isInteger(service.counts.bad_slots)
    && Number.isInteger(service.counts.unknown_slots)
    && service.counts.observed_slots === service.counts.good_slots + service.counts.bad_slots
    && isFiniteNumber(service.coverage_percent)
    && isFiniteNumber(service.sli_percent)
    && service.sli_percent >= 0 && service.sli_percent <= 100;
  const validArtifact = (data) => data && typeof data === 'object'
    && data.schema_version === 'belacca.slo-evidence.v1'
    && data.sanitized === true
    && data.publication_state === 'published'
    && isDate(data.generated_at)
    && Array.isArray(data.services)
    && data.services.length > 0
    && data.services.every(validService);

  const formatPercent = (value) => `${Number(value.toFixed(2))}%`;
  const formatWindow = (service) => service.measurement_window === 'rolling_30d' ? 'rolling 30d' : 'available history';
  const formatService = (service) => {
    const { counts } = service;
    const item = document.createElement('li');
    item.className = 'slo-service';
    item.innerHTML = `<div class="slo-service-main"><strong></strong><span class="slo-level"></span></div><div class="slo-service-meta"></div>`;
    item.querySelector('strong').textContent = service.name;
    item.querySelector('.slo-level').textContent = formatPercent(service.sli_percent);
    item.querySelector('.slo-service-meta').textContent = `${formatWindow(service)} · ${counts.observed_slots} observed (${counts.good_slots} good / ${counts.bad_slots} bad) · ${formatPercent(service.coverage_percent)} of ${counts.expected_slots} hourly slots covered`;
    return item;
  };

  const render = (data) => {
    const safe = validArtifact(data) ? data : fallback;
    const list = document.querySelector('[data-slo-services]');
    if (list) {
      list.replaceChildren();
      if (safe.services.length) safe.services.forEach((service) => list.append(formatService(service)));
      else {
        const item = document.createElement('li');
        item.textContent = safe.summary;
        list.append(item);
      }
    }
    text('[data-slo-summary]', validArtifact(data)
      ? `Measured levels from ${data.services.reduce((total, service) => total + service.counts.observed_slots, 0)} service observations; refreshed ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(data.generated_at))} UTC.`
      : safe.summary);
  };

  const refresh = async () => {
    try {
      const response = await fetch(`${remoteSloURL}?refresh=${Date.now()}`, { cache: 'no-store', credentials: 'omit', mode: 'cors' });
      if (!response.ok) throw new Error(`SLO artifact HTTP ${response.status}`);
      render(await response.json());
    } catch {
      render(fallback);
    }
  };

  render(fallback);
  refresh();
})();
