import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const image=process.argv[2] || 'designtheory:local';
const suffix=randomUUID();
const container=`designtheory-test-${suffix}`;
const volume=`designtheory-test-data-${suffix}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120_000}).trim();
let base;
async function start(){
  docker('run','-d','--name',container,'--init','-p','127.0.0.1::3001','-v',`${volume}:/app/data`,image);
  const ports=JSON.parse(docker('inspect','--format','{{json .NetworkSettings.Ports}}',container));
  base=`http://127.0.0.1:${ports['3001/tcp'][0].HostPort}`;
  for(let attempt=0;attempt<60;attempt++){
    try{const response=await fetch(base+'/api/palettes',{signal:AbortSignal.timeout(1000)});if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw Error('Container did not become ready within 30 seconds.');
}
async function request(path,method='GET',body){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  assert.ok(response.ok,`${method} ${path}: ${response.status} ${await response.clone().text()}`);
  return response.status===204?null:response.json();
}
try{
  docker('volume','create',volume);
  await start();
  assert.equal(docker('exec',container,'id','-u'),'1000');
  docker('exec',container,'/opt/instagram/bin/python','-c','import instaloader; from PIL import Image');
  for(const path of ['/','/graphic-designer.png'])assert.equal((await fetch(base+path)).status,200);
  const settings=await request('/api/settings/ollama','PUT',{enabled:false,url:'http://ollama.example:11434',model:''});
  const folder=await request('/api/folders','POST',{name:'Post folder',source:'https://www.instagram.com/p/test/'});
  const palette=await request('/api/palettes','POST',{folderId:folder.id,name:'Persistence check',colors:['#123456','#ABCDEF'],links:['https://example.com'],favorite:true,cover:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});
  const pairing=await request('/api/font-pairings','POST',{folderId:folder.id,name:'Font persistence check',fonts:[{family:'Georgia',role:'Heading',file:'data:font/woff2;base64,dGVzdA=='}],links:[]});
  // Replace the container, keeping only the volume, to test durable storage.
  docker('stop',container);docker('rm',container);
  await start();
  assert.deepEqual(await request('/api/settings/ollama'),settings);
  assert.deepEqual(await request('/api/folders'),[folder]);
  assert.deepEqual(await request('/api/palettes'),[palette]);
  assert.deepEqual(await request('/api/font-pairings'),[pairing]);
  const backup={app:'DesignTheory',version:2,folders:[folder],palettes:[palette],'font-pairings':[pairing]};
  assert.deepEqual(await request('/api/library/import','POST',{backup}),{palettes:0,'font-pairings':0,skipped:2,folders:0});
  await request('/api/palettes/'+palette.id,'DELETE');
  await request('/api/font-pairings/'+pairing.id,'DELETE');
  assert.deepEqual(await request('/api/library/import','POST',{backup}),{palettes:1,'font-pairings':1,skipped:0,folders:0});
  assert.deepEqual(await request('/api/settings/ollama'),settings);
  assert.deepEqual(await request('/api/folders'),[folder]);
  assert.deepEqual(await request('/api/palettes'),[palette]);
  assert.deepEqual(await request('/api/font-pairings'),[pairing]);
  console.log('Docker smoke checks passed: assets, Python imports, non-root runtime, both libraries and shared folders, container replacement, and backup restore.');
}catch(error){
  try{console.error(docker('logs',container));}catch{}
  throw error;
}finally{
  try{docker('rm','-f',container);}catch{}
  try{docker('volume','rm',volume);}catch{}
}
