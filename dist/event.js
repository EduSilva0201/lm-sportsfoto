(() => {
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const status = document.querySelector('#share-status');
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copiado.';
    } catch {
      document.querySelector('#share-fallback').hidden = false;
      const input = document.querySelector('#share-link');
      input.value = url;
      input.focus();
      input.select();
      status.textContent = 'Selecione e copie o link acima.';
    }
  }
  document.querySelector('#copy-event').onclick = copy;
  document.querySelector('#share-event').onclick = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: document.title, url });
    } catch (error) {
      if (error.name !== 'AbortError') await copy();
    }
  };
  document.querySelector('#share-whatsapp').href =
    'https://wa.me/?text=' + encodeURIComponent(document.title + ' ' + url);
})();
