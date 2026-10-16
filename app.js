const $=s=>document.querySelector(s),A='23456789CFGHJMPQRVWX',OSRM='https://routing.openstreetmap.de/routed-foot',
CAR='https://routing.openstreetmap.de/routed-car',
MODES=['Rail','Metro','Tram','Bus','Taxi','Ferry','Flight','Walk','Other'],
KIND={Rail:'rail',Metro:'rail',Tram:'rail',Bus:'car',Taxi:'car',Walk:'foot'},
col=m=>COLORS[m]||COLORS.Other,
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
 map.on('zoomend',()=>$('#map').classList.toggle('far',map.getZoom()<12));
