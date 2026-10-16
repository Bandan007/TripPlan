e="${known?'':esc(l.mode)}"${sv=='Other'?'':' hidden'}>
<input class="lv" placeholder="Vehicle name (optional)" value="${esc(l.veh||'')}"></div>`)})});
 $('#le').innerHTML='<h2>Minor stop legs</h2><p class="m">Walking is the default. Change the mode, minutes or fare of any leg, or write your own mode.</p>'+rows.join('')+'<p><button class="p" id="ap">Apply changes</button></p>';
 $('#le').onchange=e=>{if(e.target.classList.contains('lm'))e.target.closest('.box').querySelector('.lc').hidden=e.target.value!='Other'};
 $('#ap').onclick=async()=>{const bx=[...$('#le').querySelectorAll('.box')];let j=0;$('#ap').disabled=true;$('#ap').textContent='Applying...';
  for(const[i,s]of plan.segs.entries()){if(!s.minors.length)continue;const N=[plan.majors[i],...s.minors,plan.majors[i+1]];
   for(const[k,l]of s.legs.entries()){const x=bx[j++],v=x.querySelector('.lm').value,mode=v=='Other'?(x.querySelector('.lc').value.trim()||'Other'):v,
    tv=x.querySelector('.lt').value,mn=tv===''?l.min:+tv;
    if(mode!=l.mode){const p=await path(N[k],N[k+1],mode);l.g=p.g;l.ap=!p.ok;l.m=p.m;l.min=mn!==l.min?mn:(p.min??0)}else l.min=mn;
    l.mode=mode;l.fare=+x.querySelector('.lf').value||0;l.veh=x.querySelector('.lv').value.trim()}}
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

function html(P){MAPS.length=0;const M=P.majors,R=P.routes||[],base=[],all={};let w=0,d=0,t=0,fare=0,n=1,h='<div class="ln">';
 P.segs.forEach((s,i)=>{base[i]=n;n+=1+s.minors.length});base[M.length-1]=n;
 const dt=(p,m,l)=>({lat:p.lat,lng:p.lng,m,n:l,name:p.name}),
 segDots=i=>[dt(M[i],1,base[i]),...P.segs[i].minors.map((x,k)=>dt(x,0,base[i]+k+1)),dt(M[i+1],1,base[i+1])],
 lines=s=>s.legs.some(l=>l.g)?s.legs.filter(l=>l.g).map(l=>({g:l.g,w:l.mode=='Walk',a:l.ap,c:col(l.mode),v:l.veh})):[{g:s.geom||[],w:s.minors.length>0,c:col('Walk')}],
 T=s=>esc(String(s).replace('T',' ')),
 node=(p,tag)=>`<div class="st${p.type=='major'?' M':''}"><span class="tg">${tag}</span><b>${esc(p.name)}</b>${p.entry||p.exit?'<br>':''}${p.entry?`<span>Entry ${T(p.entry)}</span>`:''}${p.exit?`<span>Exit ${T(p.exit)}</span>`:''}</div>`,
 leg=l=>{const wk=(l.mode||'Walk')=='Walk';if(wk){w+=l.min;d+=l.m}else t+=l.min;fare+=l.fare||0;
  return`<div class="lg">${esc(l.mode||'Walk')}${l.veh?', '+esc(l.veh):''}, ${l.min} min, ${(l.m/1000).toFixed(2)} km${l.fare?', fare '+l.fare:''}</div>`};
 M.forEach((a,i)=>{h+=node(a,'Major');const s=P.segs[i];if(!s)return;
  if(s.map)h+=svg(s.map,lines(s),segDots(i));
  if(!s.minors.length){const r=R[i]||{};t+=r.min||0;if(!r.shared)fare+=r.fare||0;
   h+=`<div class="lg">${esc(r.mode||'Route')}${r.veh?', '+esc(r.veh):''}, ${r.min||0} min, ${r.shared?'same fare as the previous route':'fare '+(r.fare||0)}</div>`;return}
  s.minors.forEach((m,k)=>{h+=leg(s.legs[k])+node(m,'Minor '+(k+1))});h+=leg(s.legs[s.minors.length])});
 P.segs.forEach((s,i)=>segDots(i).forEach(x=>all[x.n]=x));
 return`<div class="box"><b>${esc(P.name)}</b><br><span class="m">Travel time ${fmt(w+t)}, of which walking ${fmt(w)} (${(d/1000).toFixed(1)} km). Total fares ${fare}.</span></div><div class="lgd">${[...new Set(P.segs.flatMap(s=>s.legs.map(l=>l.mode||'Walk')))].map(m=>`<span><i style="background:${col(m)}"></i>${esc(m)}</span>`).join('')}</div>${svg(P.map,P.segs.flatMap(lines),Object.values(all))}${h}</div>`}

/* Interactive map: drag, pinch or use the buttons to zoom. Markers and labels keep one size on screen,
   so close points separate as you zoom in, and labels that would overlap stay hidden until there is room. */
const MAPS=[];
function svg(mp,lines,dots){return`<div class="mp" data-i="${MAPS.push({mp,lines,dots})-1}"></div>`}
function initMaps(){document.querySelectorAll('.mp').forEach(el=>{if(!el.dataset.ok){el.dataset.ok=1;mapInit(el,MAPS[+el.dataset.i])}})}
function mapInit(el,{mp,lines,dots}){
 const Z=mp?mp.z:16,NS='http://www.w3.org/2000/svg',
 A=[...lines.flatMap(l=>l.g.map(p=>[wx(p[1],Z)*256,wy(p[0],Z)*256])),...dots.map(d=>[wx(d.lng,Z)*256,wy(d.lat,Z)*256])];
 if(!A.length)return;
 const ox=A[0][0],oy=A[0][1],X=g=>wx(g,Z)*256-ox,Y=t=>wy(t,Z)*256-oy,
 xs=A.map(p=>p[0]-ox),ys=A.map(p=>p[1]-oy),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),
 sz=()=>[el.clientWidth||340,el.clientHeight||380],
 fit=()=>{const[cw,ch]=sz();return{cx:(x0+x1)/2,cy:(y0+y1)/2,w:Math.max((x1-x0)*1.25,(y1-y0)*1.25*cw/ch,12)}};
 let v=fit();const home=v.w,s=document.createElementNS(NS,'svg');
 s.innerHTML='<g>'+(mp?Object.keys(mp.t).map(k=>{const[x,y]=k.split('/');return`<image href="${mp.t[k]}" x="${x*256-ox}" y="${y*256-oy}" width="256" height="256"/>`}).join(''):'')+'</g><g>'
  +lines.map(l=>`<polyline fill="none" stroke="${l.c}" stroke-opacity="${l.a?.45:1}" stroke-width="${l.w?1.5:3}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" points="${l.g.map(p=>X(p[1]).toFixed(1)+','+Y(p[0]).toFixed(1)).join(' ')}"/>`).join('')+'</g><g></g>';
 const zb=document.createElement('div');zb.className='zb';
 zb.innerHTML='<button data-z="1" aria-label="Zoom in">+</button><button data-z="-1" aria-label="Zoom in">+</button><button data-z="-1" aria-label="Zoom out">&minus;</button><button data-z="0" aria-label="Show the whole route">&#8962;</button>';
 el.append(s,zb);el.insertAdjacentHTML('beforeend','<div class="mh">Drag to move. Pinch or use + and - to zoom.</div>'+(mp?'<div class="at">&copy; OpenStreetMap contributors &copy; CARTO</div>':''));
 function draw(){const[cw,ch]=sz(),k=v.w/cw,vx=v.cx-v.w/2,vy=v.cy-ch*k/2;s.setAttribute('viewBox',`${vx} ${vy} ${v.w} ${ch*k}`);
  const P=(a,b)=>[(a-vx)/k,(b-vy)/k],pl=[],hit=b=>b.x<-2||b.y<-2||b.x+b.w>cw+2||b.y+b.h>ch+2||pl.some(p=>b.x<p.x+p.w&&b.x+b.w>p.x&&b.y<p.y+p.h&&b.y+b.h>p.y),
  D=dots.map(d=>{const[x,y]=P(X(d.lng),Y(d.lat));return{d,x,y,r:d.m?7:5}});
  D.forEach(q=>pl.push({x:q.x-q.r,y:q.y-q.r,w:2*q.r,h:2*q.r}));
  const put=(txt,cands,fs,it)=>{const tw=txt.length*fs*.55+4,th=fs+4;
   for(const[cx,cy]of cands(tw,th)){const b={x:cx,y:cy,w:tw,h:th};if(!hit(b)){pl.push(b);
    return`<text x="${cx+2}" y="${cy+fs}" font-size="${fs}" ${it?'font-style="italic" ':''}font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke" fill="#1d1d1b">${esc(txt)}</text>`}}return''};
  let o=D.map(q=>`<circle cx="${q.x}" cy="${q.y}" r="${q.r}" fill="${q.d.m?'#1d1d1b':'#7d7e77'}" stroke="#fff" stroke-width="2"/>`).join('');
  [...D].sort((a,b)=>b.d.m-a.d.m).forEach(q=>{const c=(tw,th)=>[[q.x+q.r+3,q.y-th/2],[q.x-q.r-3-tw,q.y-th/2],[q.x-tw/2,q.y-q.r-3-th],[q.x-tw/2,q.y+q.r+3]];
   o+=put(q.d.n+' '+q.d.name,c,12)||put(String(q.d.n),c,12)});
  lines.forEach(l=>{if(!l.v||!l.g.length)return;const i=Math.floor((l.g.length-1)/2),a=l.g[i],b=l.g[i+1]||a,[mx,my]=P(X((a[1]+b[1])/2),Y((a[0]+b[0])/2));
   o+=put(l.v,(tw,th)=>[[mx+6,my-th-4],[mx+6,my+4],[mx-tw-6,my-th-4],[mx-tw-6,my+4]],11,1)});
  const g=s.children[2];g.setAttribute('transform',`translate(${vx} ${vy}) scale(${k})`);g.innerHTML=o}
 function zoom(f,px,py){const r=el.getBoundingClientRect(),[cw,ch]=sz(),k=v.w/cw,dx=px-r.left-cw/2,dy=py-r.top-ch/2,
  nw=Math.min(home*4,Math.max(cw*(mp?.06:.01),v.w*f)),nk=nw/cw;v.cx+=dx*(k-nk);v.cy+=dy*(k-nk);v.w=nw;draw()}
 const ptr=new Map();
 el.onpointerdown=e=>{if(e.target.closest('.zb'))return;el.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY])};
 el.onpointermove=e=>{const old=ptr.get(e.pointerId);if(!old)return;ptr.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptr.size==1){const k=v.w/sz()[0];v.cx-=(e.clientX-old[0])*k;v.cy-=(e.clientY-old[1])*k;draw()}
  else if(ptr.size==2){const o=[...ptr].find(([id])=>id!=e.pointerId)[1],pd=Math.hypot(old[0]-o[0],old[1]-o[1]),nd=Math.hypot(e.clientX-o[0],e.clientY-o[1]);
   if(pd&&nd)zoom(pd/nd,(e.clientX+o[0])/2,(e.clientY+o[1])/2)}};
 el.onpointerup=el.onpointercancel=e=>ptr.delete(e.pointerId);
 el.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.25:.8,e.clientX,e.clientY)},{passive:false});
 el.ondblclick=e=>{if(!e.target.closest('.zb'))zoom(.5,e.clientX,e.clientY)};
 zb.onclick=e=>{const z=e.target.dataset.z;if(z==null)return;if(z=='0'){v=fit();draw()}else{const r=el.getBoundingClientRect();zoom(z=='1'?.5:2,r.left+r.width/2,r.top+r.height/2)}};
 draw();if(window.ResizeObserver)new ResizeObserver(draw).observe(el)}

$('#bView').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;
 try{const P=JSON.parse(await f.text());if(!Array.isArray(P.majors)||!Array.isArray(P.segs))throw 0;$('#out').innerHTML=html(P);show('view');initMaps()}
 catch{alert('This is not a valid .tripplan file.')}e.target.value=''};
