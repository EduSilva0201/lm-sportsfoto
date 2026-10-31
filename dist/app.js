// Catálogo demonstrativo. url recebe o endereço HTTPS do álbum externo.
const events = [
 {id:'corrida-parque',name:'Corrida no parque',type:'Corrida',platform:'Foco Radical',image:'0392'},
 {id:'futebol-domingo',name:'Futebol de domingo',type:'Futebol',platform:'Banlek',image:'7277'},
 {id:'treino-manha',name:'Treino ao ar livre',type:'Corrida',platform:'Outra plataforma',image:'1584'},
 {id:'partida',name:'Dentro das quatro linhas',type:'Futebol',platform:'Foco Radical',image:'7215'},
 {id:'ritmo',name:'No seu ritmo',type:'Corrida',platform:'Banlek',image:'9433'},
 {id:'conquista',name:'Dia de conquista',type:'Futebol',platform:'Outra plataforma',image:'2091'},
 {id:'superacao',name:'Treino de superação',type:'Corrida',platform:'Foco Radical',image:'1584'},
 {id:'equipe',name:'Em equipe',type:'Futebol',platform:'Banlek',image:'6759'},
 {id:'precisao',name:'Futebol em movimento',type:'Futebol',platform:'Outra plataforma',image:'2024'}
].map(e => ({...e,place:'Local a confirmar',date:null,url:null}));
const $ = s => document.querySelector(s);
let modality='Todos',visibleLimit=6;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function albumURL(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function renderEvents(){
 const query=normalize($('#search').value.trim()),platform=$('#platform-filter').value;
 let list=events.filter(e=>(modality==='Todos'||e.type===modality)&&(platform==='Todas'||e.platform===platform)&&normalize(`${e.name} ${e.place} ${e.type}`).includes(query));
 if($('#event-sort').value==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const shown=list.slice(0,visibleLimit);
 $('#event-grid').innerHTML=shown.map(e=>{
  const url=albumURL(e.url),name=escapeHTML(e.name);
  const action=url?`<a class="album-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver ${name} em ${escapeHTML(e.platform)} (nova aba)">Ver álbum na plataforma <span>↗</span></a>`:`<button class="album-link pending-link" data-event="${e.id}">Detalhes do álbum <span>↗</span></button>`;
  return `<article class="event-card album-card"><div class="event-photo"><img src="assets/lucas-${e.image}.svg" alt="${e.type}, fotografia de Lucas Martins" loading="lazy"><span class="tag">${e.type.toUpperCase()}</span><span class="album-status">${url?'Álbum disponível':'Exemplo · link pendente'}</span></div><div class="album-body"><p class="event-meta">${e.date?escapeHTML(e.date):'DATA A CONFIRMAR'}</p><h3>${name}</h3><p class="location">${escapeHTML(e.place)}</p><div class="destination"><span>Compra em</span><strong>${escapeHTML(e.platform)}${url?'':' · exemplo'}</strong></div>${action}</div></article>`;
 }).join('');
 $('#event-count').textContent=`${list.length} ${list.length===1?'álbum encontrado':'álbuns encontrados'}`;
 $('#shown-count').textContent=list.length?`Mostrando ${shown.length} de ${list.length} álbuns`:'';
 $('#load-more').hidden=shown.length>=list.length;
 $('#empty').hidden=list.length>0;
}
function resetListing(){visibleLimit=6;renderEvents();}
$('#search').addEventListener('input',resetListing);
$('#platform-filter').addEventListener('change',resetListing);
$('#event-sort').addEventListener('change',resetListing);
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{modality=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});resetListing();});
$('#load-more').onclick=()=>{visibleLimit+=6;renderEvents();};
$('#reset-filters').onclick=()=>{modality='Todos';$('#search').value='';$('#platform-filter').value='Todas';$('#event-sort').value='default';document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='Todos');b.setAttribute('aria-pressed',String(b.dataset.filter==='Todos'));});resetListing();};
$('#event-grid').onclick=e=>{const button=e.target.closest('[data-event]');if(!button)return;const event=events.find(x=>x.id===button.dataset.event);$('#event-title').textContent=event.name;$('#event-destination').textContent=`Destino de exemplo: ${event.platform}. A compra deste álbum acontecerá na plataforma externa.`;$('#event-details').showModal();};
$('#event-close').onclick=()=>$('#event-details').close();
const shopPhotos=[['9433','Corrida / Seu melhor ritmo'],['2024','Futebol / Dentro de campo'],['6759','Esporte / Em equipe'],['2091','Futebol / Sua conquista']];
$('#shop-grid').innerHTML=shopPhotos.map(([id,name])=>`<button class="shop-photo" data-shop aria-haspopup="dialog"><div><img src="assets/lucas-${id}.svg" alt="${name}, fotografia de Lucas Martins" loading="lazy"><span>EM BREVE</span></div><h3>${name}</h3><p>Venda direta pelo site · em desenvolvimento ↗</p></button>`).join('');
function openShop(){$('#cart').showModal();}
$('#cart-open').onclick=openShop;
$('#shop-grid').onclick=e=>{if(e.target.closest('[data-shop]'))openShop();};
$('#shop-events').onclick=()=>{$('#cart').close();location.hash='eventos';$('#search').focus({preventScroll:true});};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('.menu').onclick=()=>{const open=$('nav').classList.toggle('open');$('.menu').setAttribute('aria-expanded',String(open));};
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>{$('nav').classList.remove('open');$('.menu').setAttribute('aria-expanded','false');});
$('#quote').onsubmit=e=>{e.preventDefault();$('#form-status').textContent='Prévia validada! O formulário está pronto para receber a integração de envio. Nenhuma mensagem foi enviada.';};
renderEvents();

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
