import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {readOllamaSettings,saveOllamaSettings,resetOllamaSettings,validateOllamaSettings,testOllamaSettings} from '../server/settings.js';
import {analyzeImage} from '../server/import.js';
const config={enabled:true,url:'http://localhost:11434',model:'vision-test'};
test('settings persist across restart, override environment defaults, and can explicitly disable vision',()=>{
 const dir=mkdtempSync(join(tmpdir(),'vision-settings-'));const file=join(dir,'test.sqlite');let instance=createApp(file);
 try{assert.equal(readOllamaSettings(instance.db,{OLLAMA_MODEL:'env-model'}).model,'env-model');saveOllamaSettings(instance.db,{...config,url:'http://server:11434/'});instance.db.close();instance=createApp(file);assert.deepEqual(readOllamaSettings(instance.db,{OLLAMA_MODEL:'different-env-model'}),{...config,url:'http://server:11434'});saveOllamaSettings(instance.db,{enabled:false,url:config.url,model:''});assert.equal(readOllamaSettings(instance.db,{OLLAMA_MODEL:'env-model'}).enabled,false);assert.throws(()=>saveOllamaSettings(instance.db,{...config,url:'not a URL'}));assert.equal(readOllamaSettings(instance.db).enabled,false);resetOllamaSettings(instance.db);assert.equal(readOllamaSettings(instance.db,{OLLAMA_MODEL:'env-restored'}).model,'env-restored');}finally{instance.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('settings validate URLs and model names',()=>{
 for(const input of [{...config,url:'file:///etc/passwd'},{...config,url:'http://user:pass@server/'},{...config,url:'http://server/?token=secret'},{...config,model:''},{...config,model:'test\nmodel'},{...config,enabled:'yes'}])assert.throws(()=>validateOllamaSettings(input));
 assert.equal(validateOllamaSettings({...config,url:'https://server.example/ollama/'}).url,'https://server.example/ollama');
});
test('connection test lists installed models and checks the chosen model vision capability',async()=>{
 const calls=[];const send=async(url,options)=>{calls.push(url);if(url.endsWith('/api/tags'))return Response.json({models:[{name:'vision-test'},{name:'text-only'}]});assert.equal(JSON.parse(options.body).model,'vision-test');return Response.json({capabilities:['completion','vision']});};
 const result=await testOllamaSettings(config,{send});assert.deepEqual(result.models,['vision-test','text-only']);assert.equal(result.vision,true);assert.equal(calls.length,2);
 assert.equal((await testOllamaSettings({...config,enabled:false,model:''},{send})).vision,null);
});
test('connection test rejects unreachable servers, invalid responses, text-only and absent models',async()=>{
 await assert.rejects(()=>testOllamaSettings(config,{send:async()=>{throw Error('offline');}}),/Could not reach/);
 await assert.rejects(()=>testOllamaSettings(config,{send:async()=>Response.json({unexpected:true})}),/model list/);
 await assert.rejects(()=>testOllamaSettings(config,{send:async url=>url.endsWith('/api/tags')?Response.json({models:[]}):Response.json({capabilities:['completion']})}),/does not support images/);
 await assert.rejects(()=>testOllamaSettings(config,{send:async url=>url.endsWith('/api/tags')?Response.json({models:[]}):new Response('',{status:404})}),/not found/);
 const legacy=await testOllamaSettings(config,{send:async url=>Response.json(url.endsWith('/api/tags')?{models:[]}:{details:{}})});assert.equal(legacy.vision,null);assert.match(legacy.message,/did not report/);
});
test('image analysis immediately uses saved endpoint/model configuration rather than process environment',async()=>{
 const oldFetch=globalThis.fetch;
 try{globalThis.fetch=async(url,options)=>{assert.equal(url,'http://custom-server:11434/api/chat');assert.equal(JSON.parse(options.body).model,'chosen-model');return Response.json({message:{content:'{"palettes":[],"pairings":[]}'}});};assert.deepEqual(await analyzeImage('data:image/png;base64,dGVzdA==',{enabled:true,url:'http://custom-server:11434',model:'chosen-model'}),{palettes:[],pairings:[]});await assert.rejects(()=>analyzeImage('data:image/png;base64,dGVzdA==',{...config,enabled:false}),/Open Settings/);}finally{globalThis.fetch=oldFetch;}
});
