export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new HttpError(status, message);
};

const covers = ['0392', '7277', '1584', '7215', '9433', '2091', '6759', '2024'];
export function validateEvent(input, categories) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Dados inválidos.');
  const limits = {
    name: 120,
    place: 160,
    type: 60,
    platform: 40,
    date: 10,
    url: 2048,
    image: 100,
    status: 20,
  };
  const event = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max)
      fail(400, `Campo inválido: ${key}.`);
    event[key] = input[key].trim();
  }
  if (
    !categories.some((category) => category.kind === 'album' && category.name === event.type) ||
    !['Foco Radical', 'Banlek', 'Outra plataforma'].includes(event.platform) ||
    !['draft', 'published'].includes(event.status)
  )
    fail(400, 'Modalidade, plataforma ou situação inválida.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
    !Number.isFinite(Date.parse(event.date)) ||
    new Date(event.date).toISOString().slice(0, 10) !== event.date
  )
    fail(400, 'Data inválida.');
  try {
    const url = new URL(event.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error();
    event.url = url.href;
  } catch {
    fail(400, 'O link do álbum deve usar HTTPS, sem credenciais.');
  }
  if (
    !covers.includes(event.image) &&
    !/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(event.image)
  )
    fail(400, 'Selecione ou envie uma capa válida.');
  const photoType = input.photo_type ?? '';
  if (
    typeof photoType !== 'string' ||
    photoType.length > 60 ||
    (photoType &&
      !categories.some(
        (category) => category.kind === 'photo' && category.name === photoType.trim()
      ))
  )
    fail(400, 'Selecione um tipo de foto cadastrado.');
  event.photo_type = photoType.trim();
  if (
    input.description !== undefined &&
    (typeof input.description !== 'string' || input.description.length > 2000)
  )
    fail(400, 'A descrição deve ter até 2000 caracteres.');
  event.description = (input.description || '').trim();
  return event;
}
export async function validateContent(input, fields, imageExists) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Conteúdo inválido.');
  const content = {};
  for (const field of fields) {
    const value = input[field.key];
    if (field.kind === 'image') {
      if (
        !value ||
        typeof value !== 'object' ||
        typeof value.src !== 'string' ||
        typeof value.alt !== 'string' ||
        value.alt.length > 300 ||
        !['50% 50%', '50% 0%', '50% 100%', '0% 50%', '100% 50%'].includes(value.position)
      )
        fail(400, 'Imagem inválida: ' + field.label);
      const allowed =
        /^\/assets\/[a-zA-Z0-9-]+\.(svg|webp|png|jpg)$/.test(value.src) ||
        /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(value.src);
      if (
        !(field.key === 'portrait' && value.src === '') &&
        (!allowed || !(await imageExists(value.src)))
      )
        fail(400, 'Selecione uma imagem existente: ' + field.label);
      content[field.key] = { src: value.src, alt: value.alt.trim(), position: value.position };
    } else if (field.kind === 'choice') {
      if (!field.options.some((option) => option.value === value))
        fail(400, 'Opção inválida: ' + field.label);
      content[field.key] = value;
    } else {
      if (
        typeof value !== 'string' ||
        value.length > field.max ||
        (field.kind === 'text' && !field.optional && field.key !== 'heroCredit' && !value.trim())
      )
        fail(400, 'Campo inválido: ' + field.label);
      if (field.kind === 'url' && value) {
        try {
          const url = new URL(value);
          if (url.protocol !== 'https:' || url.username || url.password) throw Error();
        } catch {
          fail(400, 'Use um link HTTPS válido: ' + field.label);
        }
      }
      if (field.kind === 'phone' && value && !/^[1-9][0-9]{9,14}$/.test(value))
        fail(400, 'Use o WhatsApp com código do país e DDD, somente números.');
      content[field.key] = value.trim();
    }
  }
  return content;
}
export function imageType(bytes, type) {
  if (type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'jpg';
  if (type === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return 'png';
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (type === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  fail(415, 'Envie uma imagem JPG, PNG ou WebP válida, até 5 MB.');
}
