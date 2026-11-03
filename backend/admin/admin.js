const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const sectionDefinitions = {
  events: { title: 'Eventos e álbuns' },
  categories: { title: 'Categorias' },
  hero: {
    title: 'Hero / início',
    description: 'Edite os textos e as três fotos da apresentação automática da página inicial.',
  },
  biography: {
    title: 'Biografia e foto',
    description: 'Atualize o retrato, a apresentação e a história do Lucas.',
  },
  portfolio: {
    title: 'Portfólio',
    description: 'Escolha a foto de destaque e as quatro imagens do portfólio.',
  },
  shop: {
    title: 'Imagens da loja',
    description:
      'Atualize as imagens da prévia da loja. A venda direta permanece em desenvolvimento.',
  },
  testimonials: {
    title: 'Depoimentos',
    description:
      'Edite os seis depoimentos e suas imagens. O aviso de demonstração permanece visível nesta etapa.',
  },
  contact: {
    title: 'Contato / WhatsApp',
    description:
      'Informe o WhatsApp com código do país e DDD, sem espaços ou símbolos. Deixe vazio para desativar. A mensagem é revisada e enviada pelo visitante.',
  },
  faq: {
    title: 'Perguntas frequentes',
    description: 'Edite as cinco perguntas e respostas exibidas no site.',
  },
  seo: {
    title: 'Busca e compartilhamento',
    description: 'Atualize o título e a descrição usados nas buscas e nas prévias dos links.',
  },
  brand: {
    title: 'Marca e ícone',
    description: 'Troque o logotipo do site e o ícone exibido na aba do navegador.',
  },
};
let contentFields = [],
  siteContent = {},
  contentUploads = 0;
let activeSection = 'events',
  contentSaving = false;
const unsavedSections = new Set();
function fieldSection(key) {
  if (key.startsWith('contact')) return 'contact';
  if (key.startsWith('faq')) return 'faq';
  if (key === 'siteStage') return 'seo';
  if (key.startsWith('seo')) return 'seo';
  if (key.startsWith('hero')) return 'hero';
  if (['bioName', 'bioIntro', 'biography', 'portrait'].includes(key)) return 'biography';
  if (key === 'manifesto' || key.startsWith('portfolio')) return 'portfolio';
  if (key.startsWith('shop')) return 'shop';
  if (key.startsWith('testimonial')) return 'testimonials';
  return 'brand';
}
function updateSectionView() {
  const contentPage = !['events', 'categories'].includes(activeSection);
  document
    .querySelectorAll('[data-admin-page]')
    .forEach(
      (page) => (page.hidden = page.dataset.adminPage !== (contentPage ? 'content' : activeSection))
    );
  document.querySelectorAll('[data-content-page]').forEach((page) => {
    page.hidden = page.dataset.contentPage !== activeSection;
    page.disabled = page.hidden || contentSaving;
  });
  document.querySelectorAll('[data-section]').forEach((link) => {
    const selected = link.dataset.section === activeSection;
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.classList.toggle('has-changes', unsavedSections.has(link.dataset.section));
  });
  if (contentPage) {
    $('#content-heading').textContent = sectionDefinitions[activeSection].title;
    $('#content-description').textContent = sectionDefinitions[activeSection].description;
    $('#content-save').textContent =
      'Salvar ' + sectionDefinitions[activeSection].title.toLocaleLowerCase('pt-BR');
    $('#content-save').disabled = contentSaving || contentUploads > 0 || !contentFields.length;
    $('#content-preview').disabled = $('#content-save').disabled;
    $('#section-save-hint').textContent = unsavedSections.has(activeSection)
      ? 'Você tem alterações não salvas nesta seção.'
      : 'As alterações são salvas apenas nesta seção.';
  }
}
function navigateSection() {
  const aliases = {
    'events-workspace': 'events',
    'categories-panel': 'categories',
    'biography-editor': 'biography',
    'testimonials-editor': 'testimonials',
    'site-content': 'hero',
  };
  const hash = location.hash.slice(1);
  activeSection = aliases[hash] || (Object.hasOwn(sectionDefinitions, hash) ? hash : 'events');
  updateSectionView();
  $('#content-status').textContent = '';
}

let events = [],
  pendingDelete = null;
function message(text) {
  $('#message').textContent = text;
}
function signedIn(value) {
  $('#login-panel').hidden = value;
  $('#workspace').hidden = !value;
  $('#logout').hidden = !value;
  if (value) navigateSection();
}
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) signedIn(false);
    const error = Error(data.error || 'Não foi possível concluir.');
    error.status = response.status;
    throw error;
  }
  return data;
}
const json = (method, value) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});
function preview() {
  const image = $('#cover').value;
  $('#cover-preview').src = image.startsWith('/uploads/') ? image : `/assets/lucas-${image}.svg`;
}
function resetEditor() {
  $('#editor').reset();
  $('#editor').elements.id.value = '';
  $('#editor-title').textContent = 'Novo evento';
  preview();
}
function chooseCover(image) {
  const select = $('#cover');
  if (![...select.options].some((o) => o.value === image)) {
    const option = document.createElement('option');
    option.value = image;
    option.textContent = 'Capa enviada';
    select.append(option);
  }
  select.value = image;
  preview();
}
async function load() {
  await loadCategories();
  events = (await api('/api/admin/events')).events;
  renderAdminEvents();
}
let adminEventPage = 1;
const adminPageSize = 6;
function renderAdminEvents() {
  const normalizeSearch = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const query = normalizeSearch($('#admin-event-search').value.trim());
  const filtered = events.filter((event) =>
    normalizeSearch(
      `${event.name} ${event.place} ${event.type} ${event.photo_type || ''} ${event.platform}`
    ).includes(query)
  );
  const pages = Math.max(1, Math.ceil(filtered.length / adminPageSize));
  adminEventPage = Math.min(adminEventPage, pages);
  const start = (adminEventPage - 1) * adminPageSize;
  $('#list-status').textContent = filtered.length
    ? `Mostrando ${start + 1}–${Math.min(start + adminPageSize, filtered.length)} de ${filtered.length} evento(s)`
    : events.length
      ? 'Nenhum evento encontrado. Tente outra pesquisa.'
      : 'Nenhum evento ainda. Cadastre o primeiro ao lado.';
  $('#admin-event-pagination').hidden = pages <= 1;
  $('#admin-event-prev').disabled = adminEventPage === 1;
  $('#admin-event-next').disabled = adminEventPage === pages;
  $('#admin-event-page').textContent = `Página ${adminEventPage} de ${pages}`;
  $('#event-list').innerHTML = filtered
    .slice(start, start + adminPageSize)
    .map(
      (e) =>
        `<article><span class="badge">${e.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}</span><h3>${esc(e.name)}</h3><p>${esc(e.date.split('-').reverse().join('/'))} · ${esc(e.place)}</p><p>${esc(e.type)}${e.photo_type ? ` · ${esc(e.photo_type)}` : ''} · ${esc(e.platform)}</p><div class="actions"><button data-edit="${e.id}">Editar</button><button data-toggle="${e.id}">${e.status === 'published' ? 'Despublicar' : 'Publicar'}</button><button data-delete="${e.id}" class="danger">Excluir</button></div></article>`
    )
    .join('');
}
$('#admin-event-search').addEventListener('input', () => {
  adminEventPage = 1;
  renderAdminEvents();
});
for (const [id, step] of [
  ['admin-event-prev', -1],
  ['admin-event-next', 1],
]) {
  $('#' + id).onclick = () => {
    adminEventPage += step;
    renderAdminEvents();
    $('#admin-event-search').scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    $('#list-status').focus({ preventScroll: true });
  };
}
$('#login').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  message('');
  try {
    await api('/api/auth/login', json('POST', Object.fromEntries(new FormData(event.target))));
    event.target.reset();
    signedIn(true);
    await loadContent();
    await load();
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
};
$('#logout').onclick = async () => {
  try {
    const result = await api('/api/auth/logout', { method: 'POST' });
    if (result.logoutUrl) {
      location.assign(result.logoutUrl);
      return;
    }
    signedIn(false);
    events = [];
    $('#event-list').replaceChildren();
    resetEditor();
    message('Você saiu do painel.');
  } catch (error) {
    message(error.message);
  }
};
$('#new').onclick = () => {
  resetEditor();
  $('#editor').elements.name.focus();
};
$('#cancel').onclick = resetEditor;
$('#cover').onchange = preview;
$('#upload').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    message('A capa deve ter no máximo 5 MB.');
    event.target.value = '';
    return;
  }
  $('#save').disabled = true;
  event.target.disabled = true;
  message('Enviando capa…');
  try {
    const result = await api('/api/admin/uploads', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    chooseCover(result.image);
    message('Capa enviada. Salve o evento para vinculá-la.');
  } catch (error) {
    message(error.message);
  } finally {
    $('#save').disabled = false;
    event.target.disabled = false;
    event.target.value = '';
  }
};
$('#editor').onsubmit = async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));
  const id = values.id;
  delete values.id;
  $('#save').disabled = true;
  message('');
  try {
    await api(
      id ? `/api/admin/events/${id}` : '/api/admin/events',
      json(id ? 'PUT' : 'POST', values)
    );
    resetEditor();
    await load();
    message(
      values.status === 'published'
        ? 'Evento publicado! Abra o site para conferir.'
        : 'Rascunho salvo. Ele ainda não aparece no site.'
    );
  } catch (error) {
    message(error.message);
  } finally {
    $('#save').disabled = false;
  }
};
$('#event-list').onclick = async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.edit || button.dataset.delete || button.dataset.toggle;
  const record = events.find((e) => e.id === id);
  if (!record) return;
  if (button.dataset.edit) {
    chooseCover(record.image);
    for (const key of [
      'id',
      'name',
      'place',
      'type',
      'photo_type',
      'description',
      'platform',
      'date',
      'url',
      'status',
    ])
      $('#editor').elements[key].value = record[key];
    $('#editor-title').textContent = 'Editar evento';
    $('#editor').elements.name.focus();
  }
  if (button.dataset.delete) {
    pendingDelete = id;
    $('#delete-name').textContent = record.name;
    $('#delete-dialog').showModal();
  }
  if (button.dataset.toggle) {
    button.disabled = true;
    try {
      await api(
        `/api/admin/events/${id}`,
        json('PUT', { ...record, status: record.status === 'published' ? 'draft' : 'published' })
      );
      await load();
      message('Visibilidade atualizada.');
    } catch (error) {
      message(error.message);
      button.disabled = false;
    }
  }
};
$('#keep').onclick = () => $('#delete-dialog').close();
$('#confirm-delete').onclick = async () => {
  const button = $('#confirm-delete');
  button.disabled = true;
  try {
    await api(`/api/admin/events/${pendingDelete}`, { method: 'DELETE' });
    $('#delete-dialog').close();
    if ($('#editor').elements.id.value === pendingDelete) resetEditor();
    await load();
    message('Evento excluído.');
  } catch (error) {
    $('#delete-dialog').close();
    message(error.message);
  } finally {
    button.disabled = false;
    pendingDelete = null;
  }
};
(async () => {
  try {
    await api('/api/auth/session');
    signedIn(true);
    await loadContent();
    await load();
  } catch (error) {
    signedIn(false);
    if (!error.message.includes('Entre novamente')) message(error.message);
  }
})();

async function loadContent() {
  $('#content-save').disabled = true;
  let result;
  try {
    result = await api('/api/admin/content');
  } catch (error) {
    if (error.status === 404) {
      const instructions =
        'Reinicie o servidor para carregar o editor de conteúdo: no terminal, pressione Ctrl+C, execute npm.cmd run dev e atualize esta página com Ctrl+F5.';
      $('#content-status').textContent = instructions;
      message(instructions);
      return;
    }
    throw error;
  }
  contentFields = result.fields;
  siteContent = result.content;
  unsavedSections.clear();
  const positions = [
    ['50% 50%', 'Centro'],
    ['50% 0%', 'Topo'],
    ['50% 100%', 'Base'],
    ['0% 50%', 'Esquerda'],
    ['100% 50%', 'Direita'],
  ];
  const assets = [
    ...new Set(
      contentFields
        .filter((f) => f.kind === 'image')
        .map((f) => f.value.src)
        .filter(Boolean)
    ),
  ];
  $('#content-fields').innerHTML = contentFields
    .map((field) => {
      const key = esc(field.key),
        value = siteContent[field.key];
      if (field.kind === 'phone')
        return (
          '<label>' +
          esc(field.label) +
          '<input type="tel" inputmode="numeric" pattern="[1-9][0-9]{9,14}" maxlength="15" data-text="' +
          key +
          '" value="' +
          esc(value) +
          '" placeholder="Código do país + DDD + número"></label>'
        );
      if (field.kind === 'choice')
        return (
          '<label>' +
          esc(field.label) +
          '<select data-text="' +
          key +
          '">' +
          field.options
            .map(
              (option) =>
                '<option value="' +
                esc(option.value) +
                '" ' +
                (option.value === value ? 'selected' : '') +
                '>' +
                esc(option.label) +
                '</option>'
            )
            .join('') +
          '</select></label>'
        );
      if (field.kind !== 'image')
        return (
          '<label>' +
          esc(field.label) +
          (field.kind === 'url'
            ? '<input type="url" data-text="' +
              key +
              '" maxlength="' +
              field.max +
              '" value="' +
              esc(value) +
              '">'
            : '<textarea data-text="' +
              key +
              '" maxlength="' +
              field.max +
              '" ' +
              (field.key === 'heroCredit' || field.optional ? '' : 'required') +
              ' rows="' +
              (field.key === 'biography' ? 7 : 3) +
              '">' +
              esc(value) +
              '</textarea>') +
          '</label>'
        );
      const options = [
        ...new Set([...(field.key === 'portrait' ? [''] : []), ...assets, value.src]),
      ];
      return (
        '<fieldset class="image-editor" data-image="' +
        key +
        '"><legend>' +
        esc(field.label) +
        '</legend><img class="cover" data-preview src="' +
        esc(value.src || '/assets/logo-lm-sportsfoto.svg') +
        '" alt="Prévia" ' +
        (!value.src ? 'hidden' : '') +
        '><label>Imagem<select data-source>' +
        options
          .map(
            (src) =>
              '<option value="' +
              esc(src) +
              '" ' +
              (src === value.src ? 'selected' : '') +
              '>' +
              esc(
                src
                  ? src.startsWith('/uploads/')
                    ? 'Imagem enviada'
                    : src.split('/').at(-1)
                  : 'Sem retrato'
              ) +
              '</option>'
          )
          .join('') +
        '</select></label><label>Enviar nova imagem<input type="file" data-upload accept="image/jpeg,image/png,image/webp"></label><label>Descrição da imagem (acessibilidade)<input data-alt maxlength="300" value="' +
        esc(value.alt) +
        '"></label><label>Enquadramento<select data-position>' +
        positions
          .map(
            ([v, label]) =>
              '<option value="' +
              v +
              '" ' +
              (v === value.position ? 'selected' : '') +
              '>' +
              label +
              '</option>'
          )
          .join('') +
        '</select></label></fieldset>'
      );
    })
    .join('');

  for (const section of [
    'hero',
    'biography',
    'portfolio',
    'shop',
    'testimonials',
    'brand',
    'contact',
    'faq',
    'seo',
  ]) {
    const group = document.createElement('fieldset');
    group.className = 'content-page';
    group.dataset.contentPage = section;
    group.id = section + '-editor';
    const legend = document.createElement('legend');
    legend.className = 'visually-hidden';
    legend.textContent = sectionDefinitions[section].title;
    group.append(legend);
    const grid = document.createElement('div');
    grid.className = 'section-fields';
    group.append(grid);
    const keys = contentFields
      .filter((field) => fieldSection(field.key) === section)
      .map((field) => field.key);
    if (section === 'biography') {
      keys.sort((a, b) => Number(b === 'portrait') - Number(a === 'portrait'));
    }
    for (const key of keys) {
      const field = contentFields.find((field) => field.key === key);
      const node = document.querySelector(
        field.kind === 'image' ? '[data-image="' + key + '"]' : '[data-text="' + key + '"]'
      );
      if (node) grid.append(field.kind === 'image' ? node : node.closest('label'));
    }
    if (section === 'testimonials') {
      const notice = document.createElement('p');
      notice.className = 'hint';
      notice.textContent = 'Os depoimentos atuais são fictícios e as imagens são ilustrativas.';
      group.insertBefore(notice, grid);
      for (let n = 1; n <= 6; n++) {
        const card = document.createElement('details');
        card.className = 'testimonial-editor';
        card.open = n === 1;
        const summary = document.createElement('summary');
        summary.textContent = 'Depoimento ' + n;
        card.append(summary);
        const cardGrid = document.createElement('div');
        cardGrid.className = 'section-fields';
        card.append(cardGrid);
        for (const key of [
          'testimonialName' + n,
          'testimonialRole' + n,
          'testimonialQuote' + n,
          'testimonialImage' + n,
        ]) {
          const image = key.startsWith('testimonialImage');
          const node = grid.querySelector(
            image ? '[data-image="' + key + '"]' : '[data-text="' + key + '"]'
          );
          if (node) cardGrid.append(image ? node : node.closest('label'));
        }
        grid.append(card);
      }
    }
    $('#content-fields').append(group);
  }
  const portrait = document.querySelector('[data-image="portrait"]');
  if (portrait) {
    portrait.querySelector('legend').textContent = 'Foto do Lucas';
    portrait.querySelector('[data-upload]').parentElement.firstChild.textContent =
      'Enviar foto do Lucas';
    const placeholder = document.createElement('p');
    placeholder.className = 'portrait-placeholder';
    placeholder.dataset.portraitPlaceholder = '';
    placeholder.textContent = 'Escolha um retrato do Lucas. A prévia da foto aparecerá aqui.';
    portrait.querySelector('[data-preview]').after(placeholder);
  }
  updateSectionView();
  $('#content-status').textContent = '';
  document.querySelectorAll('[data-image]').forEach((box) => {
    const preview = () => {
      const img = box.querySelector('[data-preview]');
      img.hidden = !box.querySelector('[data-source]').value;
      const placeholder = box.querySelector('[data-portrait-placeholder]');
      if (placeholder) placeholder.hidden = !img.hidden;
      if (!img.hidden) img.src = box.querySelector('[data-source]').value;
      img.style.objectPosition = box.querySelector('[data-position]').value;
    };
    box.querySelector('[data-source]').onchange = preview;
    box.querySelector('[data-position]').onchange = preview;
    preview();
    box.querySelector('[data-upload]').onchange = async (event) => {
      const input = event.target,
        file = input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        message('A imagem deve ter no máximo 5 MB.');
        input.value = '';
        return;
      }
      contentUploads++;
      $('#content-save').disabled = true;
      input.disabled = true;
      $('#content-status').textContent = 'Enviando imagem…';
      try {
        const result = await api('/api/admin/uploads', {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        const select = box.querySelector('[data-source]');
        const option = new Option('Imagem enviada', result.image, true, true);
        select.add(option);
        select.value = result.image;
        preview();
        unsavedSections.add(fieldSection(box.dataset.image));
        updateSectionView();
        $('#content-status').textContent =
          'Imagem enviada. Salve a seção para publicar a alteração.';
      } catch (error) {
        message(error.message);
        $('#content-status').textContent = 'Não foi possível enviar a imagem.';
      } finally {
        contentUploads--;
        updateSectionView();
        input.disabled = false;
        input.value = '';
      }
    };
  });
}

$('#content-editor').onsubmit = async (event) => {
  event.preventDefault();
  if (contentUploads || contentSaving || !contentFields.length) return;
  const section = activeSection,
    group = document.querySelector('[data-content-page="' + section + '"]');
  if (!group) return;
  const content = structuredClone(siteContent);
  group
    .querySelectorAll('[data-text]')
    .forEach((input) => (content[input.dataset.text] = input.value));
  group.querySelectorAll('[data-image]').forEach(
    (box) =>
      (content[box.dataset.image] = {
        src: box.querySelector('[data-source]').value,
        alt: box.querySelector('[data-alt]').value,
        position: box.querySelector('[data-position]').value,
      })
  );
  contentSaving = true;
  updateSectionView();
  try {
    const result = await api('/api/admin/content', json('PUT', content));
    siteContent = result.content;
    unsavedSections.delete(section);
    $('#content-status').textContent =
      sectionDefinitions[section].title + ' salvo. Atualize o site para conferir.';
    message(
      'Alterações de ' + sectionDefinitions[section].title.toLocaleLowerCase('pt-BR') + ' salvas.'
    );
  } catch (error) {
    message(error.message);
    $('#content-status').textContent =
      'Não foi possível salvar. Suas alterações continuam no formulário.';
  } finally {
    contentSaving = false;
    updateSectionView();
  }
};
$('#content-editor').addEventListener(
  'invalid',
  (event) => {
    const details = event.target.closest('details');
    if (details) details.open = true;
  },
  true
);
$('#content-editor').addEventListener('input', (event) => {
  const group = event.target.closest('[data-content-page]');
  if (!group) return;
  unsavedSections.add(group.dataset.contentPage);
  updateSectionView();
});
$('#content-editor').addEventListener('change', (event) => {
  const group = event.target.closest('[data-content-page]');
  if (!group || event.target.matches('[data-upload]')) return;
  unsavedSections.add(group.dataset.contentPage);
  updateSectionView();
});
window.addEventListener('hashchange', navigateSection);
window.addEventListener('beforeunload', (event) => {
  if (unsavedSections.size) {
    event.preventDefault();
    event.returnValue = '';
  }
});
navigateSection();

let categories = [];
async function loadCategories() {
  try {
    categories = (await api('/api/admin/categories')).categories;
    for (const [kind, field] of [
      ['album', 'type'],
      ['photo', 'photo_type'],
    ]) {
      const select = $('#editor').elements[field],
        value = select.value;
      select.replaceChildren();
      if (kind === 'photo') select.add(new Option('Não informado', ''));
      for (const category of categories.filter((c) => c.kind === kind))
        select.add(new Option(category.name, category.name));
      if ([...select.options].some((option) => option.value === value)) select.value = value;
    }
    $('#category-list').innerHTML = ['album', 'photo']
      .map(
        (kind) =>
          '<div><h3>' +
          (kind === 'album' ? 'Categorias de álbuns' : 'Tipos de foto') +
          '</h3>' +
          categories
            .filter((c) => c.kind === kind)
            .map(
              (c) =>
                '<form data-category="' +
                esc(c.id) +
                '" class="category-row"><label>Nome<input name="name" required maxlength="60" value="' +
                esc(c.name) +
                '"></label><button>Renomear</button><button type="button" data-remove-category="' +
                esc(c.id) +
                '" class="danger">Excluir</button></form>'
            )
            .join('') +
          (categories.some((c) => c.kind === kind) ? '' : '<p>Nenhum cadastro neste grupo.</p>') +
          '</div>'
      )
      .join('');
  } catch (error) {
    if (error.status === 404)
      error.message =
        'Reinicie o servidor com Ctrl+C e npm.cmd run dev para carregar as categorias.';
    throw error;
  }
}
$('#category-create').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await api(
      '/api/admin/categories',
      json('POST', Object.fromEntries(new FormData(event.target)))
    );
    event.target.elements.name.value = '';
    await loadCategories();
    $('#category-status').textContent = 'Categoria cadastrada. Já pode ser selecionada no evento.';
  } catch (error) {
    $('#category-status').textContent = error.message;
  } finally {
    button.disabled = false;
  }
};
$('#category-list').onsubmit = async (event) => {
  const form = event.target.closest('[data-category]');
  if (!form) return;
  event.preventDefault();
  const category = categories.find((c) => c.id === form.dataset.category);
  if (!category) return;
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await api(
      '/api/admin/categories/' + category.id,
      json('PUT', { kind: category.kind, name: form.elements.name.value })
    );
    const select = $('#editor').elements[category.kind === 'album' ? 'type' : 'photo_type'];
    if (select.value === category.name) {
      select.selectedOptions[0].value = result.category.name;
      select.selectedOptions[0].textContent = result.category.name;
    }
    await load();
    $('#category-status').textContent = 'Categoria renomeada, incluindo os eventos associados.';
  } catch (error) {
    $('#category-status').textContent = error.message;
    button.disabled = false;
  }
};
$('#category-list').onclick = async (event) => {
  const button = event.target.closest('[data-remove-category]');
  if (!button) return;
  const category = categories.find((c) => c.id === button.dataset.removeCategory);
  if (!category || !confirm('Excluir a categoria “' + category.name + '”?')) return;
  button.disabled = true;
  try {
    await api('/api/admin/categories/' + category.id, { method: 'DELETE' });
    await loadCategories();
    $('#category-status').textContent = 'Categoria excluída.';
  } catch (error) {
    $('#category-status').textContent = error.message;
    button.disabled = false;
  }
};

$('#content-preview').onclick = () => {
  if (contentUploads || contentSaving) return;
  const group = document.querySelector('[data-content-page="' + activeSection + '"]');
  if (!group) return;
  const content = structuredClone(siteContent);
  group
    .querySelectorAll('[data-text]')
    .forEach((input) => (content[input.dataset.text] = input.value));
  group.querySelectorAll('[data-image]').forEach(
    (box) =>
      (content[box.dataset.image] = {
        src: box.querySelector('[data-source]').value,
        alt: box.querySelector('[data-alt]').value,
        position: box.querySelector('[data-position]').value,
      })
  );
  const dialog = $('#preview-dialog'),
    frame = $('#preview-frame');
  frame.onload = () =>
    frame.contentWindow.postMessage({ type: 'lm-preview', content }, location.origin);
  frame.src =
    '/?preview=1#' +
    ({
      hero: 'inicio',
      biography: 'sobre',
      portfolio: 'portfolio',
      shop: 'loja',
      testimonials: 'depoimentos',
      contact: 'orcamento',
      faq: 'duvidas',
    }[activeSection] || 'inicio');
  dialog.showModal();
};
$('#preview-close').onclick = () => $('#preview-dialog').close();
$('#preview-dialog').addEventListener('close', () => {
  $('#preview-frame').src = 'about:blank';
});
