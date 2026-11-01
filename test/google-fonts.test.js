import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleFontLoader,googleFontLinks} from '../src/google-fonts.js';
function fakeDocument({stylesheetFails=false,faces=[{status:'loaded'}]}={}){
 const links=[],loads=[];
 const document={head:{appendChild(link){links.push(link);queueMicrotask(()=>stylesheetFails?link.onerror?.():link.onload?.());}},createElement(){return {remove(){this.removed=true;}};},fonts:{async load(spec,text){loads.push({spec,text});return faces;}}};
 return {document,links,loads};
}
test('Google Fonts URLs encode a single family without leaking preview text or allowing query injection',()=>{
 const links=googleFontLinks('  IBM   Plex Mono  ');assert.equal(new URL(links.css).origin,'https://fonts.googleapis.com');assert.equal(new URL(links.css).searchParams.get('family'),'IBM Plex Mono');assert.equal(new URL(links.css).searchParams.get('display'),'swap');assert.ok(links.specimen.endsWith('IBM+Plex+Mono'));assert.equal(googleFontLinks(' '),null);
 const injected=new URL(googleFontLinks('Example&family=Other').css);assert.deepEqual([...injected.searchParams.keys()],['family','display']);assert.equal(injected.searchParams.get('family'),'Example&family=Other');
});
test('cloud stylesheets are shared across previews and the font is loaded from the registered web face',async()=>{
 const fake=fakeDocument();const loader=createGoogleFontLoader({document:fake.document});
 assert.deepEqual(await Promise.all([loader.load('Inter','First sample'),loader.load('Inter','Second sample')]),['Inter','Inter']);assert.equal(fake.links.length,1);assert.equal(fake.links[0].rel,'stylesheet');assert.equal(fake.links[0].referrerPolicy,'no-referrer');assert.deepEqual(fake.loads.map(v=>v.text),['First sample','Second sample']);assert.equal(fake.loads[0].spec,'400 16px "Inter"');assert.ok(!fake.links[0].href.includes('sample'));
});
test('missing Google families do not silently report an installed or fallback font as loaded, and retry is possible',async()=>{
 let fail=true;const fake=fakeDocument();fake.document.head.appendChild=link=>{fake.links.push(link);queueMicrotask(()=>fail?link.onerror?.():link.onload?.());};const loader=createGoogleFontLoader({document:fake.document});
 await assert.rejects(()=>loader.load('Missing font'),/unavailable/);assert.equal(fake.loads.length,0);assert.ok(fake.links[0].removed);fail=false;assert.equal(await loader.load('Missing font'),'Missing font');assert.equal(fake.links.length,2);
});
test('a stylesheet without a usable downloaded face does not claim a successful preview',async()=>{
 const fake=fakeDocument({faces:[]});await assert.rejects(()=>createGoogleFontLoader({document:fake.document}).load('Unknown'),/usable face/);
});
test('preview retry invalidates the stylesheet and unavailable browser APIs are reported',async()=>{
 const fake=fakeDocument(),loader=createGoogleFontLoader({document:fake.document});await loader.load('Inter');loader.invalidate('Inter');assert.ok(fake.links[0].removed);await loader.load('Inter');assert.equal(fake.links.length,2);await assert.rejects(()=>createGoogleFontLoader({document:{}}).load('Inter'),/not supported/);
});
