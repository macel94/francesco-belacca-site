(() => {
  document.documentElement.classList.add('js');
  document.querySelector('main')?.setAttribute('tabindex', '-1');

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

  const mobileMenu = document.querySelector('.mobile-menu');
  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mobileMenu.removeAttribute('open'));
  });

  const canvas = document.querySelector('#matrix');
  if (!canvas || prefersReducedMotion) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const cellSize = 24;
  const fontSize = 16;
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
    columns = Math.ceil(width / cellSize);
    drops = Array.from({ length: columns }, (_, index) => Math.random() * -40 - (index % 7) * 2);
  };

  const draw = () => {
    context.fillStyle = '#030507';
    context.fillRect(0, 0, width, height);
    context.font = `${fontSize}px monospace`;
    context.textBaseline = 'top';
    drops.forEach((drop, index) => {
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = index * cellSize;
      const y = drop * cellSize;
      const isVisible = y >= 0 && y <= height;
      context.fillStyle = isVisible ? 'rgba(232, 255, 210, .92)' : 'rgba(116, 185, 61, .55)';
      context.fillText(glyph, x, y);
      if (y > height && Math.random() > .975) drops[index] = Math.random() * -24;
      drops[index] += .34;
    });
    frame = window.requestAnimationFrame(draw);
  };
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame) {
      frame = window.requestAnimationFrame(draw);
    }
  });
  resize();
  frame = window.requestAnimationFrame(draw);
  window.addEventListener('pagehide', () => window.cancelAnimationFrame(frame), { once: true });
})();
