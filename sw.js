const C='kiddy-x16',SHELL=['./','index.html','manifest.json','supabase.min.js','jsqr.js','qrcode.js','logo-k.png','logo-kiddy.png','icon-192.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=C).map(k=>caches.delete(k)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!='GET'||new URL(r.url).origin!=location.origin)return;
e.respondWith(caches.open(C).then(async c=>{const m=await c.match(r);
const f=fetch(r).then(async n=>{if(n.ok){if(m&&(r.mode=='navigate'||r.url.endsWith('index.html'))){const a=await m.clone().text(),b=await n.clone().text();if(a!=b)clients.matchAll().then(cs=>cs.forEach(x=>x.postMessage('new')))}c.put(r,n.clone())}return n}).catch(()=>m);
return m||f}))});
