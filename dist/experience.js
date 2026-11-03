(() => {
  // Galeria ampliável com foco restaurado, teclado e gesto lateral.
  const dialog = document.querySelector('#photo-viewer'),
    full = document.querySelector('#photo-full');
  const photos = [...document.querySelectorAll('.portfolio-grid img,.manifesto-photo img')];
  let current = 0,
    trigger = null,
    touchX = null;
  function show(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    full.src = photo.currentSrc || photo.src;
    full.alt = photo.alt;
    document.querySelector('#photo-caption').textContent =
      current + 1 + ' / ' + photos.length + ' · ' + photo.alt;
  }
  for (const [index, photo] of photos.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-open';
    button.setAttribute('aria-label', 'Ampliar: ' + photo.alt);
    button.setAttribute('aria-haspopup', 'dialog');
    photo.before(button);
    button.append(photo);
    button.onclick = () => {
      trigger = button;
      show(index);
      dialog.showModal();
      document.body.classList.add('viewer-open');
    };
  }
  document.querySelector('#photo-close').onclick = () => dialog.close();
  document.querySelector('#photo-prev').onclick = () => show(current - 1);
  document.querySelector('#photo-next').onclick = () => show(current + 1);
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + 1);
    }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    trigger?.focus({ preventScroll: true });
  });
  dialog.addEventListener('touchstart', (event) => (touchX = event.changedTouches[0].clientX), {
    passive: true,
  });
  dialog.addEventListener(
    'touchend',
    (event) => {
      if (touchX === null) return;
      const delta = event.changedTouches[0].clientX - touchX;
      if (Math.abs(delta) > 60) show(current + (delta < 0 ? 1 : -1));
      touchX = null;
    },
    { passive: true }
  );
  // Contato: prepara a conversa; o visitante revisa e envia pelo WhatsApp.
  const form = document.querySelector('#quote'),
    send = document.querySelector('#quote-send'),
    status = document.querySelector('#form-status');
  function updateContact() {
    const phone = window.lmSiteContent?.contactWhatsApp || '';
    const available = /^[1-9][0-9]{9,14}$/.test(phone);
    status.textContent = available
      ? 'Preencha os dados para preparar sua mensagem.'
      : 'O contato por WhatsApp ainda não foi configurado. Fale com Lucas pelo Instagram.';
    form.querySelector('button[type=submit]').disabled = !available;
    send.hidden = true;
  }
  window.addEventListener('lm:content', updateContact);
  updateContact();
  form.addEventListener('input', () => {
    send.hidden = true;
  });
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const phone = window.lmSiteContent?.contactWhatsApp || '';
    if (!/^[1-9][0-9]{9,14}$/.test(phone)) {
      updateContact();
      return;
    }
    const values = Object.fromEntries(new FormData(form));
    const message = [
      'Olá, Lucas! Gostaria de um orçamento.',
      'Nome: ' + values.name,
      'E-mail: ' + values.email,
      'Serviço: ' + values.service,
      'Data: ' + (values.date || 'A combinar'),
      'Projeto: ' + values.message,
    ].join('\n');
    send.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
    send.hidden = false;
    status.textContent =
      'Mensagem preparada. Toque no botão abaixo para abrir o WhatsApp, revisar e enviar.';
    send.focus();
  };
  // Fecha o menu com Escape e ao tocar fora, preservando navegação por teclado.
  const menu = document.querySelector('.menu'),
    nav = document.querySelector('header nav');
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('header')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
})();

// Retorna ao cabeçalho e coloca o foco no acesso ao menu.
(() => {
  const button = document.querySelector('#back-to-top');
  if (!button) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const footer = document.querySelector('footer');
  const update = () => {
    button.hidden = window.scrollY < Math.max(320, window.innerHeight * 0.6);
    const footerVisible = footer
      ? Math.max(0, innerHeight - footer.getBoundingClientRect().top)
      : 0;
    const gap = innerWidth <= 650 ? 16 : 20;
    button.style.bottom = `calc(${gap + footerVisible}px + env(safe-area-inset-bottom))`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  button.onclick = () => {
    const menu = document.querySelector('.menu');
    const target =
      menu && getComputedStyle(menu).display !== 'none'
        ? menu
        : document.querySelector('header nav a');
    target?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
  };
  update();
})();
