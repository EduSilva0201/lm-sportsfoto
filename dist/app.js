const events=[{id:'corrida',name:'Corrida no parque',type:'Corrida',date:'Evento de exemplo · 01',place:'Local a definir',image:'assets/lucas-0392.svg',photos:['0392','1584','9433']},{id:'futebol',name:'Dentro das quatro linhas',type:'Futebol',date:'Evento de exemplo · 02',place:'Local a definir',image:'assets/lucas-7277.svg',photos:['7277','7215','2024']},{id:'treino',name:'Cada treino, uma conquista',type:'Corrida',date:'Evento de exemplo · 03',place:'Local a definir',image:'assets/lucas-1584.svg',photos:['1584','9433','0392']}];
let filter='Todos',selection=[];try{const saved=JSON.parse(localStorage.getItem('lm-demo-selection')||'[]');if(Array.isArray(saved))selection=saved.filter(x=>events.some(e=>e.id===x.event)&&[1,2,3].includes(x.photo));}catch{}
const $=s=>document.querySelector(s),money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function renderEvents(){const query=$('#search').value.toLocaleLowerCase('pt-BR');const list=events.filter(e=>(filter==='Todos'||e.type===filter)&&`${e.name} ${e.place} ${e.type}`.toLocaleLowerCase('pt-BR').includes(query));$('#event-grid').innerHTML=list.map(e=>`<button class="event-card" data-event="${e.id}"><div class="event-photo"><img src="${e.image}" alt="${e.type}, fotografia de Lucas Martins" loading="lazy"><span class="tag">${e.type.toUpperCase()}</span><span class="arrow"><span class="album-cta">Ver fotos</span><span aria-hidden="true">↗</span></span></div><p class="event-meta">${e.date.toUpperCase()}</p><h3>${e.name}</h3><span class="location">${e.place} · Explorar galeria ↗</span></button>`).join('');$('#empty').hidden=!!list.length;}
function save(){try{localStorage.setItem('lm-demo-selection',JSON.stringify(selection));}catch{}$('#count').textContent=selection.length;}
function openGallery(id){const e=events.find(e=>e.id===id);$('#gallery-title').textContent=e.name;$('#photos').innerHTML=[1,2,3].map(n=>`<article class="photo-choice"><div class="photo-preview"><img src="assets/lucas-${e.photos[n-1]}.svg" alt="Fotografia de Lucas Martins, prévia ${n}"><span class="watermark">LM SPORTSFOTO</span></div><p>Foto de exemplo ${n} · ${money(20)}</p><button data-add="${e.id}:${n}">${selection.some(x=>x.event===e.id&&x.photo===n)?'Selecionada ✓':'Selecionar foto +'}</button></article>`).join('');if(!$('#gallery').open)$('#gallery').showModal();}
$('#search').addEventListener('input',renderEvents);document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderEvents();});$('#event-grid').onclick=e=>{const b=e.target.closest('[data-event]');if(b)openGallery(b.dataset.event);};$('#photos').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const [id,n]=b.dataset.add.split(':');const photo=Number(n);if(!selection.some(x=>x.event===id&&x.photo===photo))selection.push({event:id,photo});save();openGallery(id);};
function renderCart(){$('#cart-items').innerHTML=selection.length?selection.map((x,i)=>`<div class="cart-row"><span>${events.find(e=>e.id===x.event).name}<br><small>Foto de exemplo ${x.photo} · ${money(20)}</small></span><button data-remove="${i}" aria-label="Remover foto ${x.photo}">Remover</button></div>`).join(''):'<p>Sua seleção está vazia. Explore os eventos para escolher fotos.</p>';$('#total').textContent=money(selection.length*20);}
$('#cart-open').onclick=()=>{renderCart();$('#cart').showModal();};$('#cart-items').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){selection.splice(Number(b.dataset.remove),1);save();renderCart();}};document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#continue').onclick=()=>$('#cart').close();document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));$('.menu').onclick=()=>{const open=$('nav').classList.toggle('open');$('.menu').setAttribute('aria-expanded',String(open));};document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>{$('nav').classList.remove('open');$('.menu').setAttribute('aria-expanded','false');});$('#quote').onsubmit=e=>{e.preventDefault();$('#form-status').textContent='Prévia validada! O formulário está pronto para receber a integração de envio. Nenhuma mensagem foi enviada.';};renderEvents();save();

// Efeitos decorativos progressivos: conteúdo continua acessível sem animações.
(() => {
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 let observer;
 const sections = [...document.querySelectorAll('.section-top, .manifesto-copy, .about-grid, .how > h2, .steps article, .contact > div, #quote')];
 function configureMotion() {
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
 configureMotion();
})();

// Rastro de varinha mágica: canvas decorativo, sem interceptar cliques.
(() => {
 const hero = document.querySelector('.hero');
 if (!hero) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(hover: hover) and (pointer: fine)');
 const canvas = document.createElement('canvas');
 canvas.className = 'magic-trail';
 canvas.setAttribute('aria-hidden', 'true');
 hero.append(canvas);
 const ctx = canvas.getContext('2d');
 if (!ctx) { canvas.remove(); return; }
 let particles = [], frame = 0, lastTime = 0, previous = null;
 let width = 0, height = 0, lastEmit = 0;
 const enabled = () => !reduced.matches && fine.matches && !document.hidden;
 function resize() {
  width = hero.clientWidth; height = hero.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.25);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  particles = []; previous = null;
 }
 function clear() {
  cancelAnimationFrame(frame); frame = 0; lastTime = 0;
  particles = []; previous = null;
  ctx.clearRect(0, 0, width, height);
 }
 function emit(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 12 + Math.random() * 28;
  particles.push({x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-12,
   age:0, life:.35+Math.random()*.25, size:.8+Math.random()*2,
   star:Math.random()>.78, rotation:Math.random()*Math.PI,
   color:Math.random()>.7?'#f2ffd1':'#d3f56b'});
 }
 function draw(time) {
  frame = 0;
  if (!enabled()) { clear(); return; }
  const dt = lastTime ? Math.min((time-lastTime)/1000, .04) : 1/60;
  lastTime = time;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  particles = particles.filter(p => p.age < p.life);
  for (const p of particles) {
   p.age += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 16*dt;
   const fade = Math.max(0, 1-p.age/p.life);
   const size = p.size*(.35+fade*.65);
   ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation+p.age*.7);
   ctx.globalAlpha = fade*.85; ctx.fillStyle=p.color;
   // Sem shadowBlur por partícula: evita repintura cara.
   ctx.beginPath();
   if (p.star) {
    for (let i=0;i<8;i++) {
     const a=i*Math.PI/4, radius=i%2?size*.4:size*2.4;
     const x=Math.cos(a)*radius,y=Math.sin(a)*radius;
     if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
   } else ctx.arc(0,0,size,0,Math.PI*2);
   ctx.fill(); ctx.restore();
  }
  ctx.globalCompositeOperation='source-over';
  if (particles.length) frame=requestAnimationFrame(draw);
  else lastTime=0;
 }
 hero.addEventListener('pointermove', e => {
  if (!enabled() || e.pointerType==='touch') return;
  const now = performance.now();
  if (now-lastEmit < 32) return;
  lastEmit = now;
  const rect=hero.getBoundingClientRect();
  const point={x:e.clientX-rect.left,y:e.clientY-rect.top};
  const distance=previous?Math.hypot(point.x-previous.x,point.y-previous.y):0;
  if (previous && distance<3) return;
  const start=previous||point, count=Math.min(5,Math.max(2,Math.ceil(distance/10)));
  for(let i=1;i<=count;i++) {
   const t=i/count;
   emit(start.x+(point.x-start.x)*t+(Math.random()-.5)*9,
        start.y+(point.y-start.y)*t+(Math.random()-.5)*9);
  }
  previous=point;
  if(particles.length>48)particles.splice(0,particles.length-48);
  if(!frame)frame=requestAnimationFrame(draw);
 },{passive:true});
 hero.addEventListener('pointerleave',()=>{previous=null;});
 hero.addEventListener('pointercancel',clear);
 document.addEventListener('visibilitychange',clear);
 reduced.addEventListener('change',clear); fine.addEventListener('change',clear);
 if('ResizeObserver' in window)new ResizeObserver(resize).observe(hero);
 else window.addEventListener('resize',resize,{passive:true});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
  if(!entries[0].isIntersecting)clear();
 }).observe(hero);
 resize();
})();
