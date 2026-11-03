export const escapeHTML = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
export const imagePath = (image) =>
  image.startsWith('/uploads/') ? image : '/assets/lucas-' + image + '.svg';
function metadata(title, description, url, image) {
  return (
    '<link rel="canonical" href="' +
    escapeHTML(url) +
    '"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="LM SportsFoto"><meta property="og:title" content="' +
    escapeHTML(title) +
    '"><meta property="og:description" content="' +
    escapeHTML(description) +
    '"><meta property="og:url" content="' +
    escapeHTML(url) +
    '"><meta property="og:image" content="' +
    escapeHTML(image) +
    '"><meta name="twitter:card" content="summary_large_image">'
  );
}
export function renderHome(template, content, origin) {
  if (content.testimonialsMode !== 'real')
    template = template.replace(
      /<section\s+(?:hidden\s+)?class="testimonials section"/,
      '<section hidden class="testimonials section"'
    );
  if (content.testimonialsMode === 'real')
    template = template.replace(
      '<section hidden class="testimonials section"',
      '<section class="testimonials section"'
    );
  if (content.siteStage !== 'live')
    template = template.replace(
      '</head>',
      '<meta name="robots" content="noindex, nofollow"></head>'
    );

  const title = content.seoTitle || 'LM SportsFoto | Fotografia esportiva por Lucas Martins';
  const description =
    content.seoDescription ||
    'Fotografia esportiva: encontre seus álbuns e conheça o trabalho de Lucas Martins.';
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHTML(title) + '</title>')
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      '<meta name="description" content="' + escapeHTML(description) + '">'
    )
    .replace(
      '</head>',
      metadata(title, description, origin + '/', origin + '/social/cover') + '</head>'
    );
}
export function renderEvent(template, event, origin, content = {}) {
  if (content.siteStage !== 'live')
    template = template.replace(
      '</head>',
      '<meta name="robots" content="noindex, nofollow"></head>'
    );
  const description =
    event.description ||
    event.type +
      ' em ' +
      event.place +
      '. Encontre suas fotos na plataforma ' +
      event.platform +
      '.';
  const values = {
    name: event.name,
    description,
    date: event.date.split('-').reverse().join('/'),
    place: event.place,
    type: event.type,
    photoType: event.photo_type || 'Fotografia esportiva',
    platform: event.platform,
    albumUrl: event.url,
    image: imagePath(event.image),
    pageUrl: origin + '/eventos/' + event.id,
  };
  const page = template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHTML(values[key] || ''));
  return page.replace(
    '</head>',
    metadata(
      event.name + ' | LM SportsFoto',
      description,
      values.pageUrl,
      origin + '/social/' + event.id
    ) + '</head>'
  );
}
export function sitemap(origin, events) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    [origin + '/', ...events.map((e) => origin + '/eventos/' + e.id)]
      .map((url) => '<url><loc>' + escapeHTML(url) + '</loc></url>')
      .join('') +
    '</urlset>'
  );
}
export function socialBytes(bytes, extension) {
  if (extension === '.svg') {
    const source = new TextDecoder().decode(bytes),
      match = /data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)/.exec(source);
    if (!match) throw Error('Imagem social não disponível.');
    return {
      bytes: Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
      type: 'image/' + match[1],
    };
  }
  return {
    bytes,
    type: extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg',
  };
}
