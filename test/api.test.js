import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';

test('CRUD persists across database restart, including unlimited colors, links, and cover', async(t)=>{
 const dir=mkdtempSync(join(tmpdir(),'colorpaletts-')); const file=join(dir,'palettes.sqlite');
 let instance=createApp(file);let server=instance.app.listen(0,'127.0.0.1');
 try {await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});} catch(e) {instance.db.close();rmSync(dir,{recursive:true,force:true});if(e.code==='EPERM'){t.skip('Sandbox does not permit local HTTP listeners. Run on your host for API integration checks.');return;}throw e;}
 let base=`http://127.0.0.1:${server.address().port}/api/palettes`;
 const request=(path='',method='GET',body)=>fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 try {
 assert.deepEqual(await (await request()).json(),[]);
 const palette={name:'Test palette',description:'Persistent',colors:Array.from({length:150},()=> '#12AB34'),links:['https://example.com/source','https://example.org'],cover:'data:image/png;base64,aGVsbG8=',favorite:true};
 let result=await request('','POST',palette);assert.equal(result.status,201);const saved=await result.json();
 const fonts={name:'Editorial',description:'A pairing',links:['https://example.com'],fonts:[{family:'Georgia',role:'Heading',sample:'Hello',file:'data:font/woff2;base64,dGVzdA=='},{family:'Arial',role:'Body'}],favorite:true};
 const fontRequest=(path='',method='GET',body)=>fetch(base.replace('/palettes','/font-pairings')+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const fontResponse=await fontRequest('','POST',fonts);assert.equal(fontResponse.status,201);const savedFont=await fontResponse.json();
 await new Promise(r=>server.close(r));instance.db.close();
 instance=createApp(file);server=instance.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}/api/palettes`;
 assert.deepEqual(await (await fontRequest()).json(),[savedFont]);
 assert.equal((await fontRequest('/'+savedFont.id,'PUT',{...savedFont,name:'New pairing'})).status,200);
 assert.equal((await fontRequest('','POST',{...fonts,fonts:[]})).status,400);
 assert.equal((await fontRequest('/'+savedFont.id,'DELETE')).status,204);
 assert.deepEqual(await (await fontRequest()).json(),[]);
 const loaded=await (await request()).json();assert.deepEqual(loaded,[saved]);assert.equal(loaded[0].colors.length,150);
 result=await request('/'+saved.id,'PUT',{...saved,name:'Updated',cover:''});assert.equal(result.status,200);assert.equal((await result.json()).name,'Updated');
 for(const invalid of [{...palette,name:''},{...palette,colors:[]},{...palette,colors:['red']},{...palette,links:['javascript:alert(1)']},{...palette,cover:'https://example.com'}]) assert.equal((await request('','POST',invalid)).status,400);
 assert.equal((await request('/missing','PUT',palette)).status,404);
 assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json','sec-fetch-site':'cross-site'},body:JSON.stringify(palette)})).status,403);
 assert.equal((await request('/'+saved.id,'DELETE')).status,204);assert.deepEqual(await (await request()).json(),[]);
 } finally {await new Promise(r=>server.close(r));instance.db.close();rmSync(dir,{recursive:true,force:true});}
});
