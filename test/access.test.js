import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAccessPolicy,accessGuard} from '../server/access.js';
import {createApp} from '../server/app.js';

const token = 'a'.repeat(48);
function request(headers = {}, method = 'POST', path = '/palettes') {
  const values = {host:'admin.example.test',...headers};
  return {method,path,get: name => values[name]};
}
test('locked domains and subdomains stay locked even with valid credentials', () => {
  const policy = createAccessPolicy({LOCKED_DOMAINS:'public.example.test',WRITE_TOKEN:token});
  for (const headers of [
    {host:'public.example.test'}, {host:'PUBLIC.EXAMPLE.TEST.:443'},
    {host:'child.public.example.test'}, {origin:'https://public.example.test'},
    {referer:'https://public.example.test/library'}, {origin:'null'},
    {host:'invalid/host'}, {'sec-fetch-site':'cross-site'},
    {origin:'https://other.example.test'},
  ]) assert.equal(policy(request({...headers,authorization:`Bearer ${token}`})).canWrite,false);
  assert.equal(policy(request({authorization:`Bearer ${token}`})).canWrite,true);
});
test('missing, forged, or forwarded domain headers never replace write authentication', () => {
  const policy = createAccessPolicy({LOCKED_DOMAINS:'public.example.test',WRITE_TOKEN:token});
  for (const headers of [{},{host:'127.0.0.1'},{'x-forwarded-host':'admin.example.test'}, {authorization:'Bearer wrong'}, {origin:'https://admin.example.test'}]) {
    assert.equal(policy(request(headers)).canWrite,false);
  }
  assert.equal(createAccessPolicy({LOCKED_DOMAINS:'public.example.test'})(request()).canWrite,false);
  assert.equal(createAccessPolicy({LOCKED_MODE:'true',WRITE_TOKEN:token})(request({authorization:`Bearer ${token}`})).canWrite,false);
  assert.equal(createAccessPolicy({})(request()).canWrite,true);
});
test('invalid host configuration fails at startup', () => {
  for (const env of [{LOCKED_MODE:'yes'},{LOCKED_DOMAINS:'https://example.test'},{LOCKED_DOMAINS:'*.example.test'},{WRITE_TOKEN:'short'}]) {
    assert.throws(()=>createAccessPolicy(env));
  }
});
test('guard covers every unsafe method and API path while preserving reads', () => {
  const guard = accessGuard(createAccessPolicy({LOCKED_MODE:'true'}));
  for (const path of ['/palettes','/font-pairings/id','/folders/id','/settings/ollama','/settings/ollama/test','/library/import','/library/bulk','/import/instagram','/import/analyze','/unknown']) {
    for (const method of ['POST','PUT','PATCH','DELETE']) {
      let status, next=false;
      guard(request({},method,path),{set(){},status(value){status=value;return this;},json(){}},()=>{next=true;});
      assert.equal(status,403);assert.equal(next,false);
    }
  }
  for (const method of ['GET','HEAD','OPTIONS']) {
    let next=false;guard(request({},method),{set(){}},()=>{next=true;});assert.equal(next,true);
  }
});
test('HTTP guard rejects writes before JSON parsing and preserves all tables',async t=>{
  const {app,db}=createApp(':memory:',{LOCKED_MODE:'true'});
  const server=app.listen(0,'127.0.0.1');
  try {
    await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  } catch(e) {db.close();if(e.code==='EPERM'){t.skip('Sandbox does not permit local HTTP listeners.');return;}throw e;}
  try {
    const base=`http://127.0.0.1:${server.address().port}/api`;
    for (const path of ['/palettes','/font-pairings','/folders','/settings/ollama','/library/import','/library/bulk','/import/instagram','/import/analyze']) {
      const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{malformed'});
      assert.equal(response.status,403,path);
    }
    assert.equal((await fetch(base+'/palettes')).status,200);
    assert.equal((await (await fetch(base+'/access')).json()).canWrite,false);
    for (const table of ['palettes','font_pairings','folders','settings']) assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,0);
  } finally {await new Promise(resolve=>server.close(resolve));db.close();}
});
