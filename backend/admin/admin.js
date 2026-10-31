const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let events = [], pendingDelete = null;
function message(text) { $('#message').textContent = text; }
function signedIn(value) { $('#login-panel').hidden=value; $('#workspace').hidden=!value; $('#logout').hidden=!value; }
async function api(path,options={}) {
 const response=await fetch(path,{credentials:'same-origin',...options});
 const data=await response.json();
 if(!response.ok) { if(response.status===401) signedIn(false); throw Error(data.error || 'Não foi possível concluir.'); }
 return data;
}
const json = (method,value) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
function preview() { const image=$('#cover').value; $('#cover-preview').src=image.startsWith('/uploads/')?image:`/assets/lucas-${image}.svg`; }
function resetEditor() { $('#editor').reset(); $('#editor').elements.id.value=''; $('#editor-title').textContent='Novo evento'; preview(); }
function chooseCover(image) {
 const select=$('#cover');
 if(![...select.options].some(o=>o.value===image)) { const option=document.createElement('option'); option.value=image; option.textContent='Capa enviada'; select.append(option); }
 select.value=image; preview();
}
async function load() {
 events=(await api('/api/admin/events')).events;
 $('#list-status').textContent=events.length?`${events.length} evento(s)`:'Nenhum evento ainda. Cadastre o primeiro ao lado.';
 $('#event-list').innerHTML=events.map(e=>`<article><span class="badge">${e.status==='published'?'PUBLICADO':'RASCUNHO'}</span><h3>${esc(e.name)}</h3><p>${esc(e.date.split('-').reverse().join('/'))} · ${esc(e.place)}</p><p>${esc(e.type)} · ${esc(e.platform)}</p><div class="actions"><button data-edit="${e.id}">Editar</button><button data-toggle="${e.id}">${e.status==='published'?'Despublicar':'Publicar'}</button><button data-delete="${e.id}" class="danger">Excluir</button></div></article>`).join('');
}
$('#login').onsubmit=async event=>{
 event.preventDefault(); const button=event.submitter; button.disabled=true; message('');
 try { await api('/api/auth/login',json('POST',Object.fromEntries(new FormData(event.target)))); event.target.reset(); signedIn(true); await load(); }
 catch(error) { message(error.message); } finally { button.disabled=false; }
};
$('#logout').onclick=async()=>{try{await api('/api/auth/logout',{method:'POST'});signedIn(false);events=[];$('#event-list').replaceChildren();resetEditor();message('Você saiu do painel.');}catch(error){message(error.message);}};
$('#new').onclick=()=>{resetEditor();$('#editor').elements.name.focus();};
$('#cancel').onclick=resetEditor;
$('#cover').onchange=preview;
$('#upload').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 if(file.size>5*1024*1024){message('A capa deve ter no máximo 5 MB.');event.target.value='';return;}
 $('#save').disabled=true;event.target.disabled=true;message('Enviando capa…');
 try{const result=await api('/api/admin/uploads',{method:'POST',headers:{'Content-Type':file.type},body:file});chooseCover(result.image);message('Capa enviada. Salve o evento para vinculá-la.');}
 catch(error){message(error.message);}finally{$('#save').disabled=false;event.target.disabled=false;event.target.value='';}
};
$('#editor').onsubmit=async event=>{
 event.preventDefault();const values=Object.fromEntries(new FormData(event.target));const id=values.id;delete values.id;
 $('#save').disabled=true;message('');
 try{await api(id?`/api/admin/events/${id}`:'/api/admin/events',json(id?'PUT':'POST',values));resetEditor();await load();message(values.status==='published'?'Evento publicado! Abra o site para conferir.':'Rascunho salvo. Ele ainda não aparece no site.');}
 catch(error){message(error.message);}finally{$('#save').disabled=false;}
};
$('#event-list').onclick=async event=>{
 const button=event.target.closest('button');if(!button)return;
 const id=button.dataset.edit||button.dataset.delete||button.dataset.toggle;
 const record=events.find(e=>e.id===id);if(!record)return;
 if(button.dataset.edit){chooseCover(record.image);for(const key of ['id','name','place','type','platform','date','url','status'])$('#editor').elements[key].value=record[key];$('#editor-title').textContent='Editar evento';$('#editor').elements.name.focus();}
 if(button.dataset.delete){pendingDelete=id;$('#delete-name').textContent=record.name;$('#delete-dialog').showModal();}
 if(button.dataset.toggle){button.disabled=true;try{await api(`/api/admin/events/${id}`,json('PUT',{...record,status:record.status==='published'?'draft':'published'}));await load();message('Visibilidade atualizada.');}catch(error){message(error.message);button.disabled=false;}}
};
$('#keep').onclick=()=>$('#delete-dialog').close();
$('#confirm-delete').onclick=async()=>{
 const button=$('#confirm-delete');button.disabled=true;
 try{await api(`/api/admin/events/${pendingDelete}`,{method:'DELETE'});$('#delete-dialog').close();if($('#editor').elements.id.value===pendingDelete)resetEditor();await load();message('Evento excluído.');}
 catch(error){$('#delete-dialog').close();message(error.message);}finally{button.disabled=false;pendingDelete=null;}
};
(async()=>{try{await api('/api/auth/session');signedIn(true);await load();}catch(error){signedIn(false);if(!error.message.includes('Entre novamente'))message(error.message);}})();
