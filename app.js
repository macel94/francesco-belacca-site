(() => {
  document.documentElement.classList.add('js');
  document.querySelector('main')?.setAttribute('tabindex', '-1');

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx && !prefersReducedMotion) {
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 16;
    const trailLength = 15;
    const targetFPS = 24;
    const frameInterval = 1000 / targetFPS;
    let columns = 0;
    let drops = [];
    let lastTime = 0;

    const initMatrix = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = [];

      for (let i = 0; i < columns; i += 1) {
        drops[i] = {
          y: Math.random() * -(canvas.height / fontSize),
          speed: 0.08 + Math.random() * 0.15,
          chars: Array.from({ length: trailLength }, () => chars[Math.floor(Math.random() * chars.length)]),
        };
      }
    };

    const drawMatrix = (currentTime) => {
      requestAnimationFrame(drawMatrix);

      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;
      lastTime = currentTime - (delta % frameInterval);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i += 1) {
        const drop = drops[i];
        const headY = Math.floor(drop.y);

        if (Math.random() < 0.03) {
          const randomIndex = Math.floor(Math.random() * trailLength);
          drop.chars[randomIndex] = chars[Math.floor(Math.random() * chars.length)];
        }

        for (let j = 0; j < trailLength; j += 1) {
          const currentY = headY - j;
          if (currentY < 0 || currentY * fontSize > canvas.height + fontSize) continue;

          ctx.fillStyle = j === 0
            ? '#ffffff'
            : `rgba(0, 255, 65, ${(1 - (j / trailLength)).toFixed(2)})`;
          ctx.fillText(drop.chars[j], i * fontSize, currentY * fontSize);
        }

        drop.y += drop.speed;
        if ((drop.y - trailLength) * fontSize > canvas.height) {
          drop.y = -Math.floor(Math.random() * 10);
          drop.speed = 0.08 + Math.random() * 0.15;
        }
      }
    };

    window.addEventListener('resize', initMatrix);
    initMatrix();
    requestAnimationFrame(drawMatrix);
  }

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

})();
