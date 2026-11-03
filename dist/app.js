// Catálogo demonstrativo. url recebe o endereço HTTPS do álbum externo.
let events = [
  {
    id: 'corrida-parque',
    name: 'Corrida no parque',
    type: 'Corrida',
    platform: 'Foco Radical',
    image: '0392',
  },
  {
    id: 'futebol-domingo',
    name: 'Futebol de domingo',
    type: 'Futebol',
    platform: 'Banlek',
    image: '7277',
  },
  {
    id: 'treino-manha',
    name: 'Treino ao ar livre',
    type: 'Corrida',
    platform: 'Outra plataforma',
    image: '1584',
  },
  {
    id: 'partida',
    name: 'Dentro das quatro linhas',
    type: 'Futebol',
    platform: 'Foco Radical',
    image: '7215',
  },
  { id: 'ritmo', name: 'No seu ritmo', type: 'Corrida', platform: 'Banlek', image: '9433' },
  {
    id: 'conquista',
    name: 'Dia de conquista',
    type: 'Futebol',
    platform: 'Outra plataforma',
    image: '2091',
  },
  {
    id: 'superacao',
    name: 'Treino de superação',
    type: 'Corrida',
    platform: 'Foco Radical',
    image: '1584',
  },
  { id: 'equipe', name: 'Em equipe', type: 'Futebol', platform: 'Banlek', image: '6759' },
  {
    id: 'precisao',
    name: 'Futebol em movimento',
    type: 'Futebol',
    platform: 'Outra plataforma',
    image: '2024',
  },
].map((e) => ({ ...e, place: 'Local a confirmar', date: null, url: null }));
const $ = (s) => document.querySelector(s);
let catalogConnected = false;
let modality = 'Todos',
  eventPage = 1;
const eventPageSize = 6;
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
function albumURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function renderEvents() {
  const query = normalize($('#search').value.trim()),
    platform = $('#platform-filter').value,
    photoType = $('#photo-type-filter').value,
    city = $('#city-filter').value,
    from = $('#date-from').value,
    to = $('#date-to').value;
  let list = events.filter(
    (e) =>
      (modality === 'Todos' || e.type === modality) &&
      (platform === 'Todas' || e.platform === platform) &&
      (!photoType || e.photo_type === photoType) &&
      (!city || e.place === city) &&
      (!from || (e.date && e.date >= from)) &&
      (!to || (e.date && e.date <= to)) &&
      normalize(`${e.name} ${e.place} ${e.type} ${e.photo_type || ''}`).includes(query)
  );
  if ($('#event-sort').value === 'date')
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if ($('#event-sort').value === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const pages = Math.max(1, Math.ceil(list.length / eventPageSize));
  eventPage = Math.min(eventPage, pages);
  const start = (eventPage - 1) * eventPageSize;
  const shown = list.slice(start, start + eventPageSize);
  $('#event-grid').innerHTML = shown
    .map((e) => {
      const url = albumURL(e.url),
        name = escapeHTML(e.name);
      const action = url
        ? `<a class="album-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${name} em ${escapeHTML(e.platform)} (nova aba)">Ver álbum na plataforma <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-0.125em"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>`
        : `<button class="album-link pending-link" data-event="${escapeHTML(e.id)}">Detalhes do álbum <span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-0.125em"><path d="M5 19 19 5M5 5h14v14"/></svg></span></button>`;
      return `<article class="event-card album-card"><div class="event-photo"><img src="${escapeHTML(e.image.startsWith('/uploads/') ? e.image : `assets/lucas-${e.image}.svg`)}" alt="${escapeHTML(e.type)}, fotografia de Lucas Martins" loading="lazy"><span class="tag">${escapeHTML(e.type.toUpperCase())}</span><span class="album-status">${url ? 'Álbum disponível' : 'Exemplo · link pendente'}</span></div><div class="album-body"><p class="event-meta">${e.date ? escapeHTML(e.date) : 'DATA A CONFIRMAR'}</p><h3>${name}</h3><p class="location">${escapeHTML(e.place)}</p>${e.photo_type ? `<p class="event-meta">${escapeHTML(e.photo_type)}</p>` : ''}<div class="destination"><span>Compra em</span><strong>${escapeHTML(e.platform)}${url ? '' : ' · exemplo'}</strong></div>${catalogConnected ? `<a class="event-detail-link" href="/eventos/${escapeHTML(e.id)}">Detalhes e compartilhamento <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-0.125em"><path d="M5 19 19 5M5 5h14v14"/></svg></a>` : ''}${action}</div></article>`;
    })
    .join('');
  $('#event-count').textContent =
    `${list.length} ${list.length === 1 ? 'álbum encontrado' : 'álbuns encontrados'}`;
  $('#shown-count').textContent = list.length
    ? `Mostrando ${start + 1}–${start + shown.length} de ${list.length} álbuns`
    : '';
  $('#event-pagination').hidden = pages <= 1;
  $('#event-prev').disabled = eventPage === 1;
  $('#event-next').disabled = eventPage === pages;
  $('#event-page').textContent = `Página ${eventPage} de ${pages}`;
  $('#empty').hidden = list.length > 0;
}
function resetListing() {
  eventPage = 1;
  renderEvents();
}
$('#search').addEventListener('input', resetListing);
$('#platform-filter').addEventListener('change', resetListing);
$('#event-sort').addEventListener('change', resetListing);
$('#photo-type-filter').addEventListener('change', resetListing);
for (const id of ['city-filter', 'date-from', 'date-to'])
  $('#' + id).addEventListener('change', resetListing);
document.querySelector('.filters').onclick = (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  modality = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach((item) => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  resetListing();
};
for (const [id, step] of [
  ['event-prev', -1],
  ['event-next', 1],
]) {
  $('#' + id).onclick = () => {
    eventPage += step;
    renderEvents();
    $('#search').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('#shown-count').focus({ preventScroll: true });
  };
}
$('#reset-filters').onclick = () => {
  modality = 'Todos';
  $('#search').value = '';
  $('#platform-filter').value = 'Todas';
  $('#photo-type-filter').value = '';
  for (const id of ['city-filter', 'date-from', 'date-to']) $('#' + id).value = '';
  $('#event-sort').value = 'default';
  document.querySelectorAll('[data-filter]').forEach((b) => {
    b.classList.toggle('active', b.dataset.filter === 'Todos');
    b.setAttribute('aria-pressed', String(b.dataset.filter === 'Todos'));
  });
  resetListing();
};
$('#event-grid').onclick = (e) => {
  const button = e.target.closest('[data-event]');
  if (!button) return;
  const event = events.find((x) => x.id === button.dataset.event);
  $('#event-title').textContent = event.name;
  $('#event-destination').textContent =
    `Destino de exemplo: ${event.platform}. A compra deste álbum acontecerá na plataforma externa.`;
  $('#event-details').showModal();
};
$('#event-close').onclick = () => $('#event-details').close();
const shopPhotos = [
  ['9433', 'Corrida / Seu melhor ritmo'],
  ['2024', 'Futebol / Dentro de campo'],
  ['6759', 'Esporte / Em equipe'],
  ['2091', 'Futebol / Sua conquista'],
];
$('#shop-grid').innerHTML = shopPhotos
  .map(
    ([id, name]) =>
      `<button class="shop-photo" data-shop aria-haspopup="dialog"><div><img src="assets/lucas-${id}.svg" alt="${name}, fotografia de Lucas Martins" loading="lazy"><span>EM BREVE</span></div><h3>${name}</h3><p>Venda direta pelo site · em desenvolvimento <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-0.125em"><path d="M5 19 19 5M5 5h14v14"/></svg></p></button>`
  )
  .join('');
function openShop() {
  $('#cart').showModal();
}
$('#cart-open').onclick = openShop;
$('#shop-grid').onclick = (e) => {
  if (e.target.closest('[data-shop]')) openShop();
};
$('#shop-events').onclick = () => {
  $('#cart').close();
  location.hash = 'eventos';
  $('#search').focus({ preventScroll: true });
};
document.querySelectorAll('.close').forEach((b) => (b.onclick = () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        d.close();
    }
  })
);
$('.menu').onclick = () => {
  const open = $('nav').classList.toggle('open');
  $('.menu').setAttribute('aria-expanded', String(open));
};
document.querySelectorAll('nav a').forEach(
  (a) =>
    (a.onclick = () => {
      $('nav').classList.remove('open');
      $('.menu').setAttribute('aria-expanded', 'false');
    })
);
renderEvents();
// O servidor local fornece o catálogo real. O site estático mantém a prévia demonstrativa.
(async () => {
  try {
    if (location.protocol === 'file:') return;
    const response = await fetch('/api/events', { headers: { Accept: 'application/json' } });
    if (
      response.status === 404 ||
      (response.ok && !response.headers.get('content-type')?.includes('application/json'))
    )
      return;
    if (!response.ok) throw Error('Falha no catálogo');
    const data = await response.json();
    if (!Array.isArray(data.events)) throw Error('Resposta inválida');
    events = data.events;
    catalogConnected = true;
    const cityFilter = $('#city-filter');
    cityFilter.replaceChildren(new Option('Todos os locais', ''));
    [...new Set(events.map((event) => event.place))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .forEach((place) => cityFilter.add(new Option(place, place)));
    const categories = data.categories || [];
    const filters = document.querySelector('.filters');
    filters.replaceChildren();
    for (const name of [
      'Todos',
      ...categories.filter((c) => c.kind === 'album').map((c) => c.name),
    ]) {
      const button = document.createElement('button');
      button.textContent = name;
      button.dataset.filter = name;
      button.classList.toggle('active', name === 'Todos');
      button.setAttribute('aria-pressed', String(name === 'Todos'));
      filters.append(button);
    }
    const photoFilter = $('#photo-type-filter');
    photoFilter.replaceChildren(new Option('Todos os tipos', ''));
    categories
      .filter((c) => c.kind === 'photo')
      .forEach((c) => photoFilter.add(new Option(c.name, c.name)));
    document.querySelector('.events .demo-note').hidden = true;
    document.querySelector('#empty h3').textContent = 'Nenhum evento encontrado.';
    resetListing();
  } catch {
    events = [];
    renderEvents();
    document.querySelector('.events .demo-note').hidden = true;
    document.querySelector('#empty h3').textContent = 'Não foi possível carregar os eventos.';
    document.querySelector('#empty p').textContent = 'Atualize a página para tentar novamente.';
    document.querySelector('#reset-filters').hidden = true;
  }
})();

// Efeitos decorativos progressivos: conteúdo continua acessível sem animações.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  const sections = [
    ...document.querySelectorAll(
      '.section-top, .manifesto-copy, .about-grid, .how > h2, .steps article, .contact > div, #quote'
    ),
  ];
  function configureMotion() {
    if (observer) observer.disconnect();
    sections.forEach((el) => el.classList.remove('reveal-pending'));
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );
    sections.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight - 20) return;
      el.classList.add('reveal-pending');
      observer.observe(el);
    });
  }
  reduced.addEventListener('change', configureMotion);
  configureMotion();
})();

// Rastro de varinha mágica: canvas decorativo, sem interceptar cliques.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || hero.classList.contains('hero-gallery')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const canvas = document.createElement('canvas');
  canvas.className = 'magic-trail';
  canvas.setAttribute('aria-hidden', 'true');
  hero.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  let particles = [],
    frame = 0,
    lastTime = 0,
    previous = null;
  let width = 0,
    height = 0,
    lastEmit = 0;
  const enabled = () => !reduced.matches && fine.matches && !document.hidden;
  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = [];
    previous = null;
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    particles = [];
    previous = null;
    ctx.clearRect(0, 0, width, height);
  }
  function emit(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 28;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 12,
      age: 0,
      life: 0.35 + Math.random() * 0.25,
      size: 0.8 + Math.random() * 2,
      star: Math.random() > 0.78,
      rotation: Math.random() * Math.PI,
      color: Math.random() > 0.7 ? '#f2ffd1' : '#d3f56b',
    });
  }
  function draw(time) {
    frame = 0;
    if (!enabled()) {
      clear();
      return;
    }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 1 / 60;
    lastTime = time;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    particles = particles.filter((p) => p.age < p.life);
    for (const p of particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 16 * dt;
      const fade = Math.max(0, 1 - p.age / p.life);
      const size = p.size * (0.35 + fade * 0.65);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation + p.age * 0.7);
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = p.color;
      // Sem shadowBlur por partícula: evita repintura cara.
      ctx.beginPath();
      if (p.star) {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4,
            radius = i % 2 ? size * 0.4 : size * 2.4;
          const x = Math.cos(a) * radius,
            y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (particles.length) frame = requestAnimationFrame(draw);
    else lastTime = 0;
  }
  hero.addEventListener(
    'pointermove',
    (e) => {
      if (!enabled() || e.pointerType === 'touch') return;
      const now = performance.now();
      if (now - lastEmit < 32) return;
      lastEmit = now;
      const rect = hero.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
      if (previous && distance < 3) return;
      const start = previous || point,
        count = Math.min(5, Math.max(2, Math.ceil(distance / 10)));
      for (let i = 1; i <= count; i++) {
        const t = i / count;
        emit(
          start.x + (point.x - start.x) * t + (Math.random() - 0.5) * 9,
          start.y + (point.y - start.y) * t + (Math.random() - 0.5) * 9
        );
      }
      previous = point;
      if (particles.length > 48) particles.splice(0, particles.length - 48);
      if (!frame) frame = requestAnimationFrame(draw);
    },
    { passive: true }
  );
  hero.addEventListener('pointerleave', () => {
    previous = null;
  });
  hero.addEventListener('pointercancel', clear);
  document.addEventListener('visibilitychange', clear);
  reduced.addEventListener('change', clear);
  fine.addEventListener('change', clear);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize, { passive: true });
  if ('IntersectionObserver' in window)
    new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) clear();
    }).observe(hero);
  resize();
})();

// Galeria automática da hero, sem controles de navegação.
(() => {
  const hero = document.querySelector('.hero-gallery');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('.hero-slide')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0,
    timer = null,
    paused = false;
  function advance() {
    const next = (current + 1) % slides.length;
    // Aguarda a imagem estar disponível antes de trocar para evitar um quadro vazio.
    if (!slides[next].complete || !slides[next].naturalWidth) return;
    current = next;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
    });
    const credit = hero.querySelector('.hero-credit');
    if (credit) credit.hidden = current !== 0 || !credit.textContent.trim();
  }
  function schedule() {
    clearInterval(timer);
    timer = null;
    if (!document.hidden && !reduced.matches && !paused && slides.length > 1)
      timer = setInterval(advance, 6000);
  }
  const pause = document.querySelector('#hero-pause');
  if (pause)
    pause.onclick = () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? 'Retomar animação' : 'Pausar animação';
      schedule();
    };
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  schedule();
})();
