const events=[{id:'corrida',name:'Corrida no parque',type:'Corrida',date:'Evento de exemplo · 01',place:'Local a definir',image:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=2000&q=85&fit=crop'},{id:'futebol',name:'Dentro das quatro linhas',type:'Futebol',date:'Evento de exemplo · 02',place:'Local a definir',image:'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1000&q=80&fit=crop'},{id:'treino',name:'Cada treino, uma conquista',type:'Corrida',date:'Evento de exemplo · 03',place:'Local a definir',image:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=2000&q=85&fit=crop'}];
let filter='Todos',selection=[];try{const saved=JSON.parse(localStorage.getItem('lm-demo-selection')||'[]');if(Array.isArray(saved))selection=saved.filter(x=>events.some(e=>e.id===x.event)&&[1,2,3].includes(x.photo));}catch{}
const $=s=>document.querySelector(s),money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function renderEvents(){const query=$('#search').value.toLocaleLowerCase('pt-BR');const list=events.filter(e=>(filter==='Todos'||e.type===filter)&&`${e.name} ${e.place} ${e.type}`.toLocaleLowerCase('pt-BR').includes(query));$('#event-grid').innerHTML=list.map(e=>`<button class="event-card" data-event="${e.id}"><div class="event-photo"><img src="${e.image}" alt="${e.type}, fotografia ilustrativa" loading="lazy"><span class="tag">${e.type.toUpperCase()}</span><span class="arrow"><span class="album-cta">Ver fotos</span><span aria-hidden="true">↗</span></span></div><p class="event-meta">${e.date.toUpperCase()}</p><h3>${e.name}</h3><span class="location">${e.place} · Explorar galeria ↗</span></button>`).join('');$('#empty').hidden=!!list.length;}
function save(){try{localStorage.setItem('lm-demo-selection',JSON.stringify(selection));}catch{}$('#count').textContent=selection.length;}
function openGallery(id){const e=events.find(e=>e.id===id);$('#gallery-title').textContent=e.name;$('#photos').innerHTML=[1,2,3].map(n=>`<article class="photo-choice"><div class="photo-preview"><img src="${e.image}" style="object-position:${n*25}% center" alt="Prévia ilustrativa ${n}"><span class="watermark">LM SPORTSFOTO</span></div><p>Foto de exemplo ${n} · ${money(20)}</p><button data-add="${e.id}:${n}">${selection.some(x=>x.event===e.id&&x.photo===n)?'Selecionada ✓':'Selecionar foto +'}</button></article>`).join('');if(!$('#gallery').open)$('#gallery').showModal();}
$('#search').addEventListener('input',renderEvents);document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderEvents();});$('#event-grid').onclick=e=>{const b=e.target.closest('[data-event]');if(b)openGallery(b.dataset.event);};$('#photos').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const [id,n]=b.dataset.add.split(':');const photo=Number(n);if(!selection.some(x=>x.event===id&&x.photo===photo))selection.push({event:id,photo});save();openGallery(id);};
function renderCart(){$('#cart-items').innerHTML=selection.length?selection.map((x,i)=>`<div class="cart-row"><span>${events.find(e=>e.id===x.event).name}<br><small>Foto de exemplo ${x.photo} · ${money(20)}</small></span><button data-remove="${i}" aria-label="Remover foto ${x.photo}">Remover</button></div>`).join(''):'<p>Sua seleção está vazia. Explore os eventos para escolher fotos.</p>';$('#total').textContent=money(selection.length*20);}
$('#cart-open').onclick=()=>{renderCart();$('#cart').showModal();};$('#cart-items').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){selection.splice(Number(b.dataset.remove),1);save();renderCart();}};document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#continue').onclick=()=>$('#cart').close();document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));$('.menu').onclick=()=>{const open=$('nav').classList.toggle('open');$('.menu').setAttribute('aria-expanded',String(open));};document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>{$('nav').classList.remove('open');$('.menu').setAttribute('aria-expanded','false');});$('#quote').onsubmit=e=>{e.preventDefault();$('#form-status').textContent='Prévia validada! O formulário está pronto para receber a integração de envio. Nenhuma mensagem foi enviada.';};renderEvents();save();

// Efeitos decorativos progressivos: conteúdo continua acessível sem animações.
(() => {
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
 const hero = document.querySelector('.hero');
 let frame = 0, nextX = 0, nextY = 0;
 function resetHero() {
  cancelAnimationFrame(frame); frame = 0;
  hero.style.removeProperty('--hero-x'); hero.style.removeProperty('--hero-y');
 }
 hero.addEventListener('pointermove', event => {
  if (reduced.matches || !pointer.matches || event.pointerType === 'touch') return;
  const bounds = hero.getBoundingClientRect();
  nextX = ((event.clientX - bounds.left) / bounds.width - .5) * 18;
  nextY = ((event.clientY - bounds.top) / bounds.height - .5) * 12;
  if (!frame) frame = requestAnimationFrame(() => {
   hero.style.setProperty('--hero-x', nextX + 'px');
   hero.style.setProperty('--hero-y', nextY + 'px'); frame = 0;
  });
 }, {passive:true});
 hero.addEventListener('pointerleave', resetHero);
 hero.addEventListener('pointercancel', resetHero);
 let observer;
 const sections = [...document.querySelectorAll('.section-top, .manifesto-copy, .about-grid, .how > h2, .steps article, .contact > div, #quote')];
 function configureMotion() {
  resetHero();
  if (observer) observer.disconnect();
  sections.forEach(el => el.classList.remove('reveal-pending'));
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(entries => {
   entries.forEach(entry => {
    if (entry.isIntersecting) {
     entry.target.classList.add('is-visible');
     observer.unobserve(entry.target);
    }
   });
  }, {threshold: .08, rootMargin: '0px 0px -20px 0px'});
  sections.forEach(el => {
   if (el.getBoundingClientRect().top < window.innerHeight - 20) return;
   el.classList.add('reveal-pending'); observer.observe(el);
  });
 }
 reduced.addEventListener('change', configureMotion);
 pointer.addEventListener('change', resetHero);
 configureMotion();
})();
