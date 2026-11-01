import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {createFolder,deleteFolder,bulkUpdate} from '../server/folders.js';
import {importBackup} from '../server/backup.js';
import {postResultsBackup,photoResults} from '../src/post-results.js';
const image='data:image/png;base64,dGVzdA==';
const photo=(folderId)=>({name:'Slide',image,colors:['#123456'],folderId,source:'https://www.instagram.com/p/test/',analysis:{palettes:[{name:'Designed',colors:['#ABCDEF']},{name:'Second design',colors:['#123456']}],pairings:[{name:'Type',fonts:[{family:'Georgia'}]}]}});
const all=(db,table)=>db.prepare(`SELECT document FROM ${table}`).all().map(row=>JSON.parse(row.document));

test('a post uses the same folder across libraries and repeated source URLs',()=>{const {db}=createApp(':memory:');try{
 const folder=createFolder(db,{name:'A post',source:'https://instagram.com/p/test/?img_index=2'});
 assert.equal(createFolder(db,{name:'Another name',source:'https://www.instagram.com/p/test/'}).id,folder.id);
 assert.equal(all(db,'folders').length,1);
 const results=photoResults(photo(folder.id));assert.equal(results.length,3);importBackup(db,postResultsBackup(results));
 for(const record of [...all(db,'palettes'),...all(db,'font_pairings')])assert.equal(record.folderId,folder.id);
 deleteFolder(db,folder.id);assert.equal(all(db,'folders').length,0);assert.equal(all(db,'palettes').length,2);assert.equal(all(db,'font_pairings').length,1);for(const record of [...all(db,'palettes'),...all(db,'font_pairings')])assert.equal(record.folderId,'');
 }finally{db.close();}});
test('bulk actions affect only selected items and never partially apply a failed batch',()=>{const {db}=createApp(':memory:');try{
 const folder=createFolder(db,{name:'Moved'});importBackup(db,postResultsBackup(photoResults(photo(''))));const palettes=all(db,'palettes');const first=palettes[0],other=palettes[1];
 assert.equal(bulkUpdate(db,{kind:'palettes',ids:[first.id],action:'move',folderId:folder.id}).updated,1);
 assert.equal(all(db,'palettes').find(r=>r.id===first.id).folderId,folder.id);assert.equal(all(db,'palettes').find(r=>r.id===other.id).folderId,'');
 bulkUpdate(db,{kind:'palettes',ids:[first.id],action:'favorite',favorite:true});assert.equal(all(db,'palettes').find(r=>r.id===first.id).favorite,true);
 assert.throws(()=>bulkUpdate(db,{kind:'palettes',ids:[first.id,'missing'],action:'delete'}));assert.equal(all(db,'palettes').length,2);
 assert.throws(()=>bulkUpdate(db,{kind:'palettes',ids:[first.id],action:'move',folderId:'missing'}));assert.equal(all(db,'palettes').find(r=>r.id===first.id).folderId,folder.id);
 bulkUpdate(db,{kind:'palettes',ids:[first.id],action:'delete'});assert.equal(all(db,'palettes')[0].id,other.id);assert.equal(all(db,'font_pairings').length,1);
 }finally{db.close();}});
test('folders survive database reopen and round-trip through backup, including folder-only backups',()=>{
 const dir=mkdtempSync(join(tmpdir(),'design-folders-'));let instance=createApp(join(dir,'test.sqlite'));const target=createApp(':memory:');
 try{const folder=createFolder(instance.db,{name:'Keep me'});importBackup(instance.db,postResultsBackup(photoResults(photo(folder.id))));instance.db.close();instance=createApp(join(dir,'test.sqlite'));assert.equal(all(instance.db,'folders')[0].name,'Keep me');const backup={app:'DesignTheory',version:2,folders:all(instance.db,'folders'),palettes:all(instance.db,'palettes'),'font-pairings':all(instance.db,'font_pairings')};
 const preview=importBackup(target.db,backup,{preview:true});assert.equal(preview.folders,1);assert.equal(all(target.db,'folders').length,0);
 assert.equal(importBackup(target.db,backup).folders,1);assert.equal(all(target.db,'palettes')[0].folderId,folder.id);
 assert.equal(importBackup(target.db,{app:'DesignTheory',version:2,folders:[{id:'empty',name:'Empty',source:''}],palettes:[],'font-pairings':[]}).folders,1);
 const bad={...backup,folders:[{id:'rollback',name:'Rollback',source:''}],palettes:[{...backup.palettes[0],id:'new',folderId:'missing'}]};assert.throws(()=>importBackup(target.db,bad),/Folder missing/);assert.ok(!all(target.db,'folders').some(f=>f.id==='rollback'));
 }finally{instance.db.close();target.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('backup remaps post folder IDs by source when a destination folder already exists',()=>{const {db}=createApp(':memory:');try{const existing=createFolder(db,{name:'Existing post',source:'https://www.instagram.com/p/test/'});const backup=postResultsBackup(photoResults(photo('incoming')));backup.folders=[{id:'incoming',name:'Imported post',source:existing.source}];assert.equal(importBackup(db,backup).folders,0);assert.equal(all(db,'folders').length,1);assert.equal(all(db,'palettes')[0].folderId,existing.id);}finally{db.close();}});
test('color/font toggles, result selection, and thumbnail choices are independent',()=>{
 assert.equal(photoResults(photo(''),{importColors:false}).length,1);assert.equal(photoResults(photo(''),{importFonts:false}).filter(r=>r.kind==='font-pairings').length,0);assert.deepEqual(photoResults(photo(''),{importColors:false,importFonts:false}),[]);
 const results=photoResults(photo(''),{thumbnails:false});assert.ok(results.every(r=>r.cover===''));assert.ok(results.every(r=>r.sourceImage===image));
 const selected=results.filter(r=>r.kind==='font-pairings');const without=postResultsBackup(selected,{includeThumbnails:false});assert.equal(without.palettes.length,0);assert.equal(without['font-pairings'].length,1);assert.equal(without['font-pairings'][0].cover,'');assert.ok(!('sourceImage' in without['font-pairings'][0]));
 assert.equal(postResultsBackup(selected,{includeThumbnails:true})['font-pairings'][0].cover,image);
});
