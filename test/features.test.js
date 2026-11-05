import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateRecord} from '../server/validation.js';
import {instagramShortcode,cleanAnalysis,analyzeImage} from '../server/import.js';
import {extractColors} from '../src/colors.js';
import {createApp} from '../server/app.js';
import {paletteTemplates,fontTemplates} from '../src/templates.js';
const base={name:'Design study',links:['https://www.instagram.com/p/example/'],favorite:false};
test('font pairings validate multiple fonts and preserve files',()=>{
 const record=validateRecord({...base,fonts:[{family:'Georgia',role:'Heading',file:'data:font/woff2;base64,dGVzdA=='},{family:'Arial',role:'Body'}]},'font-pairings');
 assert.equal(record.fonts.length,2);assert.equal(record.fonts[0].file,'data:font/woff2;base64,dGVzdA==');assert.equal(record.fonts[1].file,'');
 for(const fonts of [[],[{}],[{family:' '}],[{family:'Arial',file:'https://untrusted.example/font.woff'}]]) assert.throws(()=>validateRecord({...base,fonts},'font-pairings'));
 assert.throws(()=>validateRecord({...base,links:['javascript:alert(1)'],fonts:[{family:'Arial'}]},'font-pairings'));
});
test('new palettes require adding colors before saving, with no fixed color count',()=>{
 assert.throws(()=>validateRecord({...base,colors:[]}));
 assert.equal(validateRecord({...base,colors:Array(1000).fill('#123ABC')}).colors.length,1000);
});
test('both libraries and uploaded fonts survive reopening the same database',()=>{
 const dir=mkdtempSync(join(tmpdir(),'designtheory-'));const path=join(dir,'library.sqlite');let instance=createApp(path);
 try{const font=validateRecord({...base,fonts:[{family:'Test font',file:'data:font/woff2;base64,dGVzdA=='}]},'font-pairings');instance.db.prepare('INSERT INTO font_pairings VALUES (?,?)').run('font',JSON.stringify(font));const palette=validateRecord({...base,colors:['#123ABC']});instance.db.prepare('INSERT INTO palettes VALUES (?,?)').run('palette',JSON.stringify(palette));instance.db.close();instance=createApp(path);assert.deepEqual(JSON.parse(instance.db.prepare('SELECT document FROM font_pairings WHERE id=?').get('font').document),font);assert.deepEqual(JSON.parse(instance.db.prepare('SELECT document FROM palettes WHERE id=?').get('palette').document),palette);}finally{instance.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Instagram import only accepts direct Instagram HTTPS post URLs',()=>{
 assert.equal(instagramShortcode('https://www.instagram.com/p/Abc_123-/?img_index=2'),'Abc_123-');assert.equal(instagramShortcode('https://instagram.com/reel/test/'),'test');
 for(const url of ['http://instagram.com/p/test/','https://instagram.com.evil.test/p/test/','https://127.0.0.1/p/test/','https://user:pass@instagram.com/p/test/','https://www.instagram.com/profile/','https://www.instagram.com:444/p/test/'])assert.throws(()=>instagramShortcode(url));
});
test('color extraction identifies dominant colors and ignores transparent pixels',()=>{
 const pixels=new Uint8ClampedArray([255,0,0,255,255,0,0,255,0,0,255,255,0,255,0,0]);const colors=extractColors(pixels);assert.equal(colors[0],'#FF0000');assert.ok(colors.includes('#0000FF'));assert.ok(!colors.includes('#00FF00'));assert.deepEqual(extractColors(new Uint8ClampedArray()),[]);
 assert.deepEqual(extractColors(new Uint8ClampedArray([100,150,200,255])) , ['#6496C8']);
});
test('multiple analysis palettes and pairings survive, invalid model output is dropped',()=>{
 const result=cleanAnalysis({palettes:[{name:'One',colors:['#123456']},{name:'Two',colors:['#ABCDEF']},{colors:['invalid']}],pairings:[{name:'A',fonts:[{family:'Georgia'},{family:'Arial'}]},{name:'B',fonts:[{family:'Verdana'}]},{fonts:[{}]}]});assert.equal(result.palettes.length,1);assert.deepEqual(result.palettes[0].colors,['#123456','#ABCDEF']);assert.equal(result.pairings.length,2);assert.equal(result.pairings[0].fonts.length,2);assert.equal(result.pairings[0].fonts[0].file,'');assert.deepEqual(cleanAnalysis(null),{palettes:[],pairings:[]});
});
test('single-swatch palettes from one image merge into one palette, multi-color palettes are kept',()=>{
 const merged=cleanAnalysis({palettes:[{name:'CREAM',colors:['#EEEBDA']},{name:'INDIGO',colors:['#282B4A']},{name:'NAVY',colors:['#282b4a']}],pairings:[]});
 assert.equal(merged.palettes.length,1);assert.deepEqual(merged.palettes[0].colors,['#EEEBDA','#282B4A']);
 const mixed=cleanAnalysis({palettes:[{name:'Brand',colors:['#111111','#222222']},{name:'a',colors:['#333333']},{name:'b',colors:['#444444']}]});
 assert.equal(mixed.palettes.length,2);assert.deepEqual(mixed.palettes.find(p=>p.name==='Brand').colors,['#111111','#222222']);
 const lone=cleanAnalysis({palettes:[{name:'Solo',colors:['#555555']}]});assert.equal(lone.palettes.length,1);assert.equal(lone.palettes[0].name,'Solo');
});
test('vision adapter sends the image and handles model errors without fabricating results',async()=>{
 const previousFetch=globalThis.fetch;const previousModel=process.env.OLLAMA_MODEL;process.env.OLLAMA_MODEL='test-vision';
 try{
 globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith('/api/chat'));const body=JSON.parse(options.body);assert.equal(body.messages[0].images[0],'aGVsbG8=');assert.equal(body.stream,false);return new Response(JSON.stringify({message:{content:JSON.stringify({palettes:[],pairings:[{fonts:[{family:'Georgia'}]}]})}}),{status:200});};
 assert.equal((await analyzeImage('data:image/png;base64,aGVsbG8=')).pairings.length,1);
 globalThis.fetch=async()=>new Response('unavailable',{status:500});await assert.rejects(()=>analyzeImage('data:image/png;base64,aGVsbG8='),/request failed/);
 globalThis.fetch=async()=>new Response(JSON.stringify({message:{content:'not json'}}));await assert.rejects(()=>analyzeImage('data:image/png;base64,aGVsbG8='),/unreadable/);
 }finally{globalThis.fetch=previousFetch;if(previousModel===undefined)delete process.env.OLLAMA_MODEL;else process.env.OLLAMA_MODEL=previousModel;}
});
test('templates can be reused without editing their originals',()=>{
 const savedFont=structuredClone(fontTemplates[0]);savedFont.fonts[0].family='Edited';assert.equal(fontTemplates[0].fonts[0].family,'Playfair Display');const colors=[...paletteTemplates[0][1]];colors.push('#000000');assert.equal(paletteTemplates[0][1].length,5);
});
