const $=s=>document.querySelector(s),A='23456789CFGHJMPQRVWX',OSRM='https://routing.openstreetmap.de/routed-foot',
CAR='https://routing.openstreetmap.de/routed-car',
MODES=['Rail','Metro','Tram','Bus','Taxi','Ferry','Flight','Walk','Other'],
KIND={Rail:'rail',Metro:'rail',Tram:'rail',Bus:'car',Taxi:'car',Walk:'foot'},
esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
fmt=m=>m>=60?Math.floor(m/60)+' h '+m%60+' min':m+' min',
hav=(p,q)=>{const r=x=>x*Math.PI/180,a=Math.sin(r(q.lat-p.lat)/2)**2+Math.cos(r(p.lat))*Math.cos(r(q.lat))*Math.sin(r(q.lng-p.lng)/2)**2;return 12742000*Math.asin(Math.sqrt(a))};
let pts=[],cur=null,map,layer,plan,sel;
const majors=()=>pts.filter(p=>p.type=='major');
const show=id=>{['home','plan','view'].forEach(s=>$('#'+s).hidden=s!=id);if(id=='plan'&&map)map.invalidateSize()};
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>show('home'));

/* Plus Codes (Open Location Code): full codes decode offline, short codes use a reference point */
function pre(lat,lng,n){let a=lat+90,o=lng+180,s='';for(let i=0,r=20;i<n/2;i++,r/=20){const x=Math.min(19,Math.floor(a/r)),y=Math.min(19,Math.floor(o/r));s+=A[x]+A[y];a-=x*r;o-=y*r}return s}
function olc(code,ref){let[h,t]=code.toUpperCase().split('+'),sh=0;
 if(h.length<8){const n=8-h.length;sh=20/20**(n/2-1);h=pre(ref.lat,ref.lng,n)+h}
 const s=h+t;if([...s].some(c=>!A.includes(c)))return null;
 let la=-90,lo=-180,r=20,k=0;for(;k+1<s.length&&k<10;k+=2,r/=20){la+=A.indexOf(s[k])*r;lo+=A.indexOf(s[k+1])*r}
 la+=r*10;lo+=r*10;
 if(sh){if(la-ref.lat>sh/2)la-=sh;else if(la-ref.lat<-sh/2)la+=sh;if(lo-ref.lng>sh/2)lo-=sh;else if(lo-ref.lng<-sh/2)lo+=sh}
 return{lat:la,lng:lo}}
async function geo(q){const r=await(await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q))).json();
 return r[0]?{lat:+r[0].lat,lng:+r[0].lon,name:r[0].display_name.split(',')[0]}:null}

/* Map (Leaflet is loaded only when creating a plan, so viewing works offline) */
function loadL(){return window.L?Promise.resolve():new Promise((ok,no)=>{
 const l=document.createElement('link');l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';document.head.append(l);
 const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';s.onload=ok;s.onerror=no;document.head.append(s)})}
function init(){if(map)return map.invalidateSize();
 map=L.map('map').setView([20,0],2);
 L.tileLayer(TILE,{maxZoom:19,crossOrigin:true,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);
 layer=L.layerGroup().addTo(map);draw();
 map.on('click',async e=>{const{lat,lng}=e.latlng;$('#nm').value='';setCur(lat,lng,'');
  try{const r=await(await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${lat}&lon=${lng}`)).json();
   if(cur&&cur.lat==lat&&!$('#nm').value)$('#nm').value=r.name||(r.display_name||'').split(',')[0]||''}catch{}})}
$('#bNew').onclick=()=>{show('plan');$('#kn').hidden=!!KEY;loadL().then(init).catch(()=>$('#loc').textContent='The map could not load. Check your internet connection.')};
function setCur(lat,lng,name){cur={lat,lng};if(name||!$('#nm').value)$('#nm').value=name;
 $('#loc').textContent=`Selected ${lat.toFixed(5)}, ${lng.toFixed(5)}. Choose a type, then press Add point.`;
 if(map){if(sel)sel.setLatLng([lat,lng]);else sel=L.circleMarker([lat,lng],{radius:12,color:'#545551',weight:4,fillOpacity:.25}).addTo(map)}}
$('#find').onclick=async()=>{const q=$('#q').value.trim();if(!q)return;
 try{const m=q.match(/^([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]*)\s*(.*)$/i);
  if(m){let ref=map?map.getCenter():{lat:0,lng:0};
   if(m[1].split('+')[0].length<8&&m[2])ref=(await geo(m[2]))||ref;
   const p=olc(m[1],ref);if(!p)throw 0;setCur(p.lat,p.lng,'Plus Code '+m[1].toUpperCase())}
  else{const r=await geo(q);if(!r)throw 0;setCur(r.lat,r.lng,r.name)}
  if(map)map.setView([cur.lat,cur.lng],15)}
 catch{$('#loc').textContent='Not found. Check the text and your internet connection.'}};
$('#ty').onchange=()=>{$('#fm').hidden=$('#ty').value=='major'};

$('#add').onclick=()=>{if(!cur)return alert('Pick a location first: search, enter a Plus Code or tap the map.');
 const t=$('#ty').value,M=majors(),p={name:$('#nm').value||'Point '+(pts.length+1),lat:cur.lat,lng:cur.lng,type:t,entry:$('#en').value,exit:$('#ex').value};
 if(t=='minor'){if(M.length<2)return alert('Add at least two major points before adding minor points.');p.after=M[+$('#sg').value]}
 pts.push(p);cur=null;if(sel){sel.remove();sel=null};
 ['#q','#nm','#en','#ex'].forEach(s=>$(s).value='');$('#loc').textContent='';draw()};
$('#rt').oninput=e=>{const t=e.target,a=majors()[+t.dataset.i],k=t.dataset.k;if(!a||!k)return;a.rt=a.rt||{};
 if(k=='mode'){const c=t.parentElement.querySelector('[data-k=mc]');c.hidden=t.value!='Other';a.rt.mode=t.value=='Other'?(c.value.trim()||'Other'):t.value}
 else if(k=='mc')a.rt.mode=t.value.trim()||'Other';
 else a.rt[k]=t.type=='checkbox'?t.checked:t.value};
$('#same').onchange=e=>{const m=majors()[+e.target.value];if(m){setCur(m.lat,m.lng,m.name);if(map)map.setView([m.lat,m.lng],15)}};

function draw(){const M=majors(),v=$('#sg').value;
 $('#sg').innerHTML=M.slice(0,-1).map((m,i)=>`<option value="${i}">${esc(m.name)} to ${esc(M[i+1].name)}</option>`).join('');if(v)$('#sg').value=v;
 $('#same').innerHTML='<option value="">No, choose a new location</option>'+M.map((m,i)=>`<option value="${i}">${esc(m.name)}</option>`).join('');
 $('#pl').innerHTML=pts.map((p,i)=>`<div class="box row"><span><b>${p.type=='major'?'Major':'Minor'}</b> ${esc(p.name)}</span><button data-i="${i}">Remove</button></div>`).join('');
 $('#pl').querySelectorAll('button').forEach(b=>b.onclick=()=>{const p=pts[+b.dataset.i];pts=pts.filter(x=>x!==p&&x.after!==p);draw()});
 $('#rt').innerHTML=M.slice(0,-1).map((a,i)=>{const b=M[i+1],r=a.rt=a.rt||{mode:'Rail',min:'',fare:'',shared:false},k=MODES.includes(r.mode),oth=!k||r.mode=='Other',
  nm=`<b>${esc(a.name)} to ${esc(b.name)}</b>${hav(a,b)<20?' <span class="m">(same place)</span>':''}`;
  if(pts.some(p=>p.after===a))return`<div class="box">${nm}<br><span class="m">This route goes through the minor stops. After building the route you can change the mode of each leg.</span></div>`;
  return`<div class="box">${nm}<div class="g"><div><label>Mode</label><select data-i="${i}" data-k="mode">${MODES.map(m=>`<option${m==(k?r.mode:'Other')?' selected':''}>${m}</option>`).join('')}</select>
<input data-i="${i}" data-k="mc" placeholder="Write your own mode" value="${k?'':esc(r.mode)}"${oth?'':' hidden'}></div>
<div><label>Travel time (minutes)</label><input type="number" min="0" data-i="${i}" data-k="min" value="${esc(r.min)}"></div>
<div><label>Fare</label><input type="number" min="0" step="any" data-i="${i}" data-k="fare" value="${esc(r.fare)}"></div></div>
${i?`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-i="${i}" data-k="shared"${r.shared?' checked':''}>Same fare as the previous route</label>`:''}</div>`}).join('');
 if(!layer)return;layer.clearLayers();
 pts.forEach(p=>L.circleMarker([p.lat,p.lng],{radius:p.type=='major'?9:6,color:p.type=='major'?'#1d1d1b':'#7d7e77',fillOpacity:.8}).bindTooltip(p.name,{permanent:true,direction:'right',offset:[8,0],className:'lbl'}).addTo(layer))}

/* Route that follows the real road or track for the chosen mode. If it cannot, a straight line is returned with ok:false. */
async function path(a,b,mode){const k=KIND[mode],line={g:[[a.lat,a.lng],[b.lat,b.lng]],ok:!k,m:Math.round(hav(a,b))};
 if(hav(a,b)<20)return{...line,ok:true,m:0,min:0};
 try{if(k=='foot'||k=='car'){const r=await(await fetch(`${k=='foot'?OSRM:CAR}/route/v1/${k=='foot'?'foot':'driving'}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`)).json();
   if(r.code=='Ok'){const x=r.routes[0];return{g:x.geometry.coordinates.map(([o,l])=>[l,o]),ok:true,m:Math.round(x.distance),min:Math.round(x.duration/60)}}}
  if(k=='rail'){const r=await(await fetch(`${RAIL}?point=${a.lat},${a.lng}&point=${b.lat},${b.lng}&profile=all_tracks&points_encoded=false`)).json(),x=r.paths&&r.paths[0];
   if(x)return{g:x.points.coordinates.map(([o,l])=>[l,o]),ok:true,m:Math.round(x.distance)}}}catch{}
 return line}

/* Solve one segment: start major, minors in best order (TSP), end major. Every leg keeps its own mode and line. */
async function solve(a,mins,b,r){
 if(!mins.length){const p=await path(a,b,r.mode);return{minors:[],legs:[{mode:r.mode,min:r.min,m:p.m,g:p.g,ap:!p.ok}]}}
 const N=[a,...mins,b],n=N.length,C=N.map(p=>p.lng+','+p.lat).join(';');
 let T=N.map(p=>N.map(q=>hav(p,q)*1.3/1.25)),D=N.map(p=>N.map(q=>hav(p,q)*1.3));
 try{const r=await(await fetch(`${OSRM}/table/v1/foot/${C}?annotations=duration,distance`)).json();
  if(r.code=='Ok'){T=r.durations.map((x,i)=>x.map((v,j)=>v??T[i][j]));D=r.distances.map((x,i)=>x.map((v,j)=>v??D[i][j]))}}catch{}
 const m=mins.length,idx=[...Array(m)].map((_,i)=>i+1),
 cost=o=>{let s=0,p=0;for(const k of o){s+=T[p][k];p=k}return s+T[p][n-1]};
 let best=idx;
 if(m<=8){let bc=1/0;(function perm(o,rest){if(!rest.length){const k=cost(o);if(k<bc){bc=k;best=o}return}
  rest.forEach((x,i)=>perm([...o,x],rest.filter((_,j)=>j!=i)))})([],idx)}
 else{let o=[],rest=[...idx],p=0;while(rest.length){rest.sort((x,y)=>T[p][x]-T[p][y]);p=rest.shift();o.push(p)}
  for(let imp=true;imp;){imp=false;for(let i=0;i<m-1;i++)for(let j=i+1;j<m;j++){
   const q=[...o.slice(0,i),...o.slice(i,j+1).reverse(),...o.slice(j+1)];if(cost(q)<cost(o)-1e-9){o=q;imp=true}}}
  best=o}
 const seq=[0,...best,n-1],legs=[];
 for(let i=0;i<seq.length-1;i++){const p=await path(N[seq[i]],N[seq[i+1]],'Walk');
  legs.push({mode:'Walk',min:p.ok?p.min:Math.round(T[seq[i]][seq[i+1]]/60),m:p.ok?p.m:Math.round(D[seq[i]][seq[i+1]]),g:p.g,ap:!p.ok})}
 return{minors:best.map(k=>{const{after,type,...x}=N[k];return x}),legs}}

$('#build').onclick=async()=>{const M=majors();if(M.length<2)return alert('Add at least two major points.');
 const b=$('#build');b.disabled=true;b.textContent='Calculating...';
 try{const routes=M.slice(0,-1).map(a=>({mode:a.rt?.mode||'Rail',min:+a.rt?.min||0,fare:+a.rt?.fare||0,shared:!!a.rt?.shared})),segs=[];
  for(let i=0;i<M.length-1;i++)segs.push(await solve(M[i],pts.filter(p=>p.type=='minor'&&p.after===M[i]),M[i+1],routes[i]));
  plan={v:4,name:$('#pn').value||'Trip',created:new Date().toISOString(),majors:M.map(({rt,...m})=>m),segs,routes};
  await showPlan()}
 catch{alert('Could not build the route. Try again.')}
 b.disabled=false;b.textContent='Build route'};

async function showPlan(){$('#res').innerHTML='<p class="m">Preparing the offline map...</p>';
 const ls=s=>s.legs.flatMap(l=>l.g.map(([lat,lng])=>({lat,lng})));
 plan.map=await tiles(plan.segs.flatMap(ls),30);
 for(const s of plan.segs){s.map=s.minors.length?await tiles(ls(s),30):null}
 const ap=plan.segs.flatMap(s=>s.legs).filter(l=>l.ap).length,hasMin=plan.segs.some(s=>s.minors.length);
 $('#res').innerHTML='<p><button class="p" id="dl">Download .tripplan file</button></p>'
  +(plan.map?'':'<div class="box">The saved file has no map because no tiles were downloaded. Add your CARTO key to config.js and check your internet connection.</div>')
  +(ap?`<div class="box">${ap} leg(s) could not follow a real road or track, so a straight light grey line is shown.</div>`:'')
  +(hasMin?'<div id="le"></div>':'')+html(plan);
 $('#dl').onclick=()=>dl(plan);if(hasMin)legEditor();
 if(layer){draw();plan.segs.forEach(s=>s.legs.forEach(l=>L.polyline(l.g,{weight:l.mode=='Walk'?2:3,color:l.ap?'#8a8b85':'#3d3e3a'}).addTo(layer)));
  map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lng])).pad(.2))}}

/* Minor stop legs default to walking. The user can pick another mode or write their own. */
function legEditor(){const rows=[];
 plan.segs.forEach((s,i)=>{if(!s.minors.length)return;const N=[plan.majors[i],...s.minors,plan.majors[i+1]];
  s.legs.forEach((l,k)=>{const known=MODES.includes(l.mode),sv=known?l.mode:'Other';
   rows.push(`<div class="box"><b>${esc(N[k].name)} to ${esc(N[k+1].name)}</b><div class="g"><div><label>Mode</label><select class="lm">${MODES.map(m=>`<option${m==sv?' selected':''}>${m}</option>`).join('')}</select></div>
<div><label>Minutes</label><input class="lt" type="number" min="0" value="${l.min}"></div><div><label>Fare</label><input class="lf" type="number" min="0" step="any" value="${l.fare||''}"></div></div>
<input class="lc" placeholder="Write your own mode, for example Rickshaw" value="${known?'':esc(l.mode)}"${sv=='Other'?'':' hidden'}></div>`)})});
 $('#le').innerHTML='<h2>Minor stop legs</h2><p class="m">Walking is the default. Change the mode, minutes or fare of any leg, or write your own mode.</p>'+rows.join('')+'<p><button class="p" id="ap">Apply changes</button></p>';
 $('#le').onchange=e=>{if(e.target.classList.contains('lm'))e.target.closest('.box').querySelector('.lc').hidden=e.target.value!='Other'};
 $('#ap').onclick=async()=>{const bx=[...$('#le').querySelectorAll('.box')];let j=0;$('#ap').disabled=true;$('#ap').textContent='Applying...';
  for(const[i,s]of plan.segs.entries()){if(!s.minors.length)continue;const N=[plan.majors[i],...s.minors,plan.majors[i+1]];
   for(const[k,l]of s.legs.entries()){const x=bx[j++],v=x.querySelector('.lm').value,mode=v=='Other'?(x.querySelector('.lc').value.trim()||'Other'):v,
    tv=x.querySelector('.lt').value,mn=tv===''?l.min:+tv;
    if(mode!=l.mode){const p=await path(N[k],N[k+1],mode);l.g=p.g;l.ap=!p.ok;l.m=p.m;l.min=mn!==l.min?mn:(p.min??0)}else l.min=mn;
    l.mode=mode;l.fare=+x.querySelector('.lf').value||0}}
  await showPlan()}}

function dl(P){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(P)],{type:'application/json'}));
 a.download=(P.name||'trip').replace(/\W+/g,'_')+'.tripplan';a.click()}

/* Viewer: renders the itinerary and an SVG sketch, no network needed */
const wx=(g,z)=>(g+180)/360*2**z,
wy=(t,z)=>(1-Math.log(Math.tan(t*Math.PI/180)+1/Math.cos(t*Math.PI/180))/Math.PI)/2*2**z;
/* Download the map tiles that cover the points (at most cap tiles) and embed them as data URLs */
async function tiles(q,cap){if(!KEY)return null;const la=q.map(p=>p.lat),lo=q.map(p=>p.lng),
 pd=Math.max(.0005,(Math.max(...la)-Math.min(...la))*.1,(Math.max(...lo)-Math.min(...lo))*.1),
 b=[Math.min(...la)-pd,Math.max(...la)+pd,Math.min(...lo)-pd,Math.max(...lo)+pd];let z,r;
 for(z=17;;z--){r=[Math.floor(wx(b[2],z)),Math.floor(wx(b[3],z)),Math.floor(wy(b[1],z)),Math.floor(wy(b[0],z))];
  if((r[1]-r[0]+1)*(r[3]-r[2]+1)<=cap||z<=2)break}
 const t={},jobs=[];
 for(let x=r[0];x<=r[1];x++)for(let y=r[2];y<=r[3];y++)jobs.push((async()=>{try{
  const rs=await fetch(TILE.replace('{z}',z).replace('{x}',x).replace('{y}',y));if(!rs.ok)throw 0;const bl=await rs.blob();if(!bl.type.startsWith('image/'))throw 0;
  t[x+'/'+y]=await new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result);f.readAsDataURL(bl)})}catch{}})());
 await Promise.all(jobs);return Object.keys(t).length?{z,x0:r[0],x1:r[1],y0:r[2],y1:r[3],t}:null}

function html(P){const M=P.majors,R=P.routes||[],base=[],all={};let w=0,d=0,t=0,fare=0,n=1,h='<div class="ln">';
 P.segs.forEach((s,i)=>{base[i]=n;n+=1+s.minors.length});base[M.length-1]=n;
 const dt=(p,m,l)=>({lat:p.lat,lng:p.lng,m,l:l+' '+p.name}),
 segDots=i=>[dt(M[i],1,base[i]),...P.segs[i].minors.map((x,k)=>dt(x,0,base[i]+k+1)),dt(M[i+1],1,base[i+1])],
 lines=s=>s.legs.some(l=>l.g)?s.legs.filter(l=>l.g).map(l=>({g:l.g,w:l.mode=='Walk',a:l.ap})):[{g:s.geom||[],w:s.minors.length>0}],
 T=s=>esc(String(s).replace('T',' ')),
 node=(p,tag)=>`<div class="st${p.type=='major'?' M':''}"><span class="tg">${tag}</span><b>${esc(p.name)}</b>${p.entry||p.exit?'<br>':''}${p.entry?`<span>Entry ${T(p.entry)}</span>`:''}${p.exit?`<span>Exit ${T(p.exit)}</span>`:''}</div>`,
 leg=l=>{const wk=(l.mode||'Walk')=='Walk';if(wk){w+=l.min;d+=l.m}else t+=l.min;fare+=l.fare||0;
  return`<div class="lg">${esc(l.mode||'Walk')}, ${l.min} min, ${(l.m/1000).toFixed(2)} km${l.fare?', fare '+l.fare:''}</div>`};
 M.forEach((a,i)=>{h+=node(a,'Major');const s=P.segs[i];if(!s)return;
  if(s.map)h+=svg(s.map,lines(s),segDots(i));
  if(!s.minors.length){const r=R[i]||{};t+=r.min||0;if(!r.shared)fare+=r.fare||0;
   h+=`<div class="lg">${esc(r.mode||'Route')}, ${r.min||0} min, ${r.shared?'same fare as the previous route':'fare '+(r.fare||0)}</div>`;return}
  s.minors.forEach((m,k)=>{h+=leg(s.legs[k])+node(m,'Minor '+(k+1))});h+=leg(s.legs[s.minors.length])});
 P.segs.forEach((s,i)=>segDots(i).forEach(x=>all[x.l]=x));
 return`<div class="box"><b>${esc(P.name)}</b><br><span class="m">Travel time ${fmt(w+t)}, of which walking ${fmt(w)} (${(d/1000).toFixed(1)} km). Total fares ${fare}.</span></div>${svg(P.map,P.segs.flatMap(lines),Object.values(all))}${h}</div>`}

/* Draws embedded map tiles, then the route and numbered stops on top, all in one SVG */
function svg(mp,lines,dots){const Z=mp?mp.z:12;let x0,y0,W,H;
 if(mp){x0=mp.x0*256;y0=mp.y0*256;W=(mp.x1-mp.x0+1)*256;H=(mp.y1-mp.y0+1)*256}
 else{const q=lines.flatMap(l=>l.g),X=q.map(p=>wx(p[1],Z)*256),Y=q.map(p=>wy(p[0],Z)*256),pd=40;
  x0=Math.min(...X)-pd;y0=Math.min(...Y)-pd;W=Math.max(...X)-x0+pd;H=Math.max(...Y)-y0+pd}
 const px=(la,lo)=>(wx(lo,Z)*256-x0).toFixed(1)+','+(wy(la,Z)*256-y0).toFixed(1),u=W/60;
 let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;border:1px solid var(--bd);border-radius:6px;background:var(--pn);margin:8px 0" role="img" aria-label="Route map">`;
 if(mp)for(const k in mp.t){const[x,y]=k.split('/');s+=`<image href="${mp.t[k]}" x="${x*256-x0}" y="${y*256-y0}" width="256" height="256"/>`}
 lines.forEach(l=>s+=`<polyline fill="none" stroke="${l.a?'#8a8b85':'#3d3e3a'}" stroke-width="${l.w?1.5:3}" vector-effect="non-scaling-stroke" stroke-linejoin="round" points="${l.g.map(p=>px(p[0],p[1])).join(' ')}"/>`);
 dots.forEach(p=>{const[cx,cy]=px(p.lat,p.lng).split(',');
  s+=`<circle cx="${cx}" cy="${cy}" r="${u*(p.m?.9:.6)}" fill="${p.m?'#1d1d1b':'#7d7e77'}" stroke="#fff" stroke-width="${u*.2}"/><text x="${+cx+u}" y="${+cy-u}" font-size="${u*1.15}" font-weight="700" stroke="#fff" stroke-width="${u*.3}" paint-order="stroke" fill="#1d1d1b">${esc(p.l)}</text>`});
 return s+(mp?`<text x="${W-u/2}" y="${H-u/2}" text-anchor="end" font-size="${u*.9}" stroke="#fff" stroke-width="${u*.25}" paint-order="stroke" fill="#333">&copy; OpenStreetMap contributors &copy; CARTO</text>`:'')+'</svg>'}

$('#bView').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;
 try{const P=JSON.parse(await f.text());if(!Array.isArray(P.majors)||!Array.isArray(P.segs))throw 0;$('#out').innerHTML=html(P);show('view')}
 catch{alert('This is not a valid .tripplan file.')}e.target.value=''};
