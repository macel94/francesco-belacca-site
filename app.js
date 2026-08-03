(() => {
  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  }

  const canvas = document.querySelector('#matrix');
  if (!canvas || prefersReducedMotion) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const glyphs = '01アイウエオ{}[]<>/\\$#:+-*';
  let width = 0;
  let height = 0;
  let columns = 0;
  let drops = [];
  let frame = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Math.ceil(width / 22);
    drops = Array.from({ length: columns }, () => Math.random() * -40);
  };

  const draw = () => {
    context.fillStyle = 'rgba(7, 10, 14, .075)';
    context.fillRect(0, 0, width, height);
    context.font = '11px monospace';
    drops.forEach((drop, index) => {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = index * 22;
      const y = drop * 22;
      context.fillStyle = index % 13 === 0 ? 'rgba(183, 243, 74, .52)' : 'rgba(85, 159, 130, .22)';
      context.fillText(glyph, x, y);
      if (y > height && Math.random() > .975) drops[index] = Math.random() * -20;
      drops[index] += .25;
    });
    frame = window.requestAnimationFrame(draw);
  };
  window.addEventListener('resize', resize, { passive: true });
  resize();
  frame = window.requestAnimationFrame(draw);
  window.addEventListener('pagehide', () => window.cancelAnimationFrame(frame), { once: true });
})();
