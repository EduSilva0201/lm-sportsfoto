// O mesmo renderizador atende o conteúdo publicado e a prévia administrativa.
(() => {
  let fields = [],
    saved = {},
    pendingPreview = null;
  const preview = new URLSearchParams(location.search).get('preview') === '1' && parent !== window;
  function apply(content) {
    for (const field of fields) {
      const value = content[field.key];
      if (value === undefined) continue;
      document.querySelectorAll(field.selector).forEach((element) => {
        if (field.kind === 'image') {
          if (element.tagName === 'LINK') {
            element.href = value.src;
            element.removeAttribute('type');
            return;
          }
          element.hidden = !value.src;
          if (!value.src) {
            element.removeAttribute('src');
            return;
          }
          element.src = value.src;
          element.alt = value.alt;
          element.style.objectPosition = value.position;
        } else if (field.kind === 'choice') {
          if (field.key === 'siteStage') {
            element.hidden = value === 'live';
            document.body.classList.toggle('site-live', value === 'live');
            const footer = document.querySelector('footer small');
            if (footer)
              footer.textContent =
                value === 'live'
                  ? 'LM SportsFoto · Lucas Martins'
                  : 'Projeto privado · Versão inicial';
          }

          if (field.key === 'testimonialsMode') {
            element.hidden = value === 'hidden';
            document.querySelector('.testimonials-notice').hidden = value === 'real';
          }
        } else if (field.kind === 'phone') {
          element.hidden = !/^[1-9][0-9]{9,14}$/.test(value);
          if (!element.hidden) element.href = 'https://wa.me/' + value;
        } else if (field.kind === 'url') {
          if (value) {
            element.href = value;
            element.target = '_blank';
            element.rel = 'noopener noreferrer';
          } else {
            element.removeAttribute('href');
            element.removeAttribute('target');
          }
        } else if (element.tagName === 'META') {
          element.content = value;
        } else {
          const parts = String(value).split(/\u2197\uFE0F?/);
          element.replaceChildren();
          parts.forEach((part, index) => {
            if (index) {
              const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              for (const [name, attribute] of Object.entries({
                viewBox: '0 0 24 24',
                width: '1em',
                height: '1em',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'aria-hidden': 'true',
                focusable: 'false',
              }))
                icon.setAttribute(name, attribute);
              icon.style.verticalAlign = '-0.125em';
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', 'M5 19 19 5M5 5h14v14');
              icon.append(path);
              element.append(icon);
            }
            element.append(document.createTextNode(part));
          });
          element.style.whiteSpace = 'pre-line';
          if (field.key === 'heroCredit') element.hidden = !value;
        }
      });
    }
    window.lmSiteContent = content;
    window.dispatchEvent(new CustomEvent('lm:content', { detail: content }));
  }
  if (preview) {
    const badge = document.createElement('div');
    badge.className = 'preview-banner';
    badge.textContent = 'PRÉVIA · ALTERAÇÕES AINDA NÃO SALVAS';
    document.body.prepend(badge);
    window.addEventListener('message', (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== parent ||
        event.data?.type !== 'lm-preview'
      )
        return;
      pendingPreview = event.data.content;
      if (fields.length) apply({ ...saved, ...pendingPreview });
    });
  }
  (async () => {
    if (location.protocol === 'file:') return;
    try {
      const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
      if (
        response.status === 404 ||
        !response.headers.get('content-type')?.includes('application/json')
      )
        return;
      if (!response.ok) throw Error();
      const result = await response.json();
      fields = result.fields;
      saved = result.content;
      apply({ ...saved, ...(preview ? pendingPreview : null) });
    } catch {
      console.warn(
        'Não foi possível carregar o conteúdo editado. Atualize a página para tentar novamente.'
      );
    }
  })();
})();
