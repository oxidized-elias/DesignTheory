import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {importBackup} from '../server/backup.js';
const palette={id:'p1',name:'Study',colors:['#123456'],links:['https://example.com'],cover:'data:image/png;base64,dGVzdA==',favorite:true,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'};
const font={id:'f1',name:'Type',fonts:[{family:'Georgia',role:'Heading',sample:'Hello',file:'data:font/woff2;base64,dGVzdA=='}],links:[]};
const backup=()=>({app:'DesignTheory',version:2,palettes:[structuredClone(palette)],'font-pairings':[structuredClone(font)]});
const count=(db,table)=>db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
test('backup preview does not write; restore includes both libraries and assets; repeated imports skip duplicates',()=>{
 const {db}=createApp(':memory:');try{
 assert.deepEqual(importBackup(db,backup(),{preview:true}),{palettes:1,'font-pairings':1,skipped:0});assert.equal(count(db,'palettes'),0);assert.equal(count(db,'font_pairings'),0);
 assert.deepEqual(importBackup(db,backup()),{palettes:1,'font-pairings':1,skipped:0});
 const restored=JSON.parse(db.prepare('SELECT document FROM palettes').get().document);assert.equal(restored.cover,palette.cover);assert.equal(restored.favorite,true);assert.equal(restored.createdAt,palette.createdAt);
 const restoredFont=JSON.parse(db.prepare('SELECT document FROM font_pairings').get().document);assert.deepEqual(restoredFont.fonts,font.fonts);
 assert.deepEqual(importBackup(db,backup()),{palettes:0,'font-pairings':0,skipped:2});
 const changed=backup();changed.palettes[0].name='Attempt overwrite';importBackup(db,changed);assert.equal(JSON.parse(db.prepare('SELECT document FROM palettes').get().document).name,'Study');
 }finally{db.close();}
});
test('legacy exports and ID-less records import and deduplicate by content',()=>{const {db}=createApp(':memory:');try{const {id,...record}=palette;assert.equal(importBackup(db,[record]).palettes,1);assert.equal(importBackup(db,[record]).skipped,1);assert.equal(count(db,'palettes'),1);}finally{db.close();}});
test('invalid backups make no changes, even when earlier records are valid',()=>{const {db}=createApp(':memory:');try{for(const input of [null,{}, {...backup(),version:99}, {...backup(),'font-pairings':[{...font,fonts:[]}]}, [{...palette,createdAt:'invalid'}], [palette,{...palette,id:'p2',colors:['invalid']}]]){assert.throws(()=>importBackup(db,input));assert.equal(count(db,'palettes'),0);assert.equal(count(db,'font_pairings'),0);}}finally{db.close();}});
test('database failures roll back the entire import across both libraries',()=>{const {db}=createApp(':memory:');try{db.exec("CREATE TRIGGER reject_font BEFORE INSERT ON font_pairings BEGIN SELECT RAISE(ABORT, 'test failure'); END");assert.throws(()=>importBackup(db,backup()),/test failure/);assert.equal(count(db,'palettes'),0);assert.equal(count(db,'font_pairings'),0);}finally{db.close();}});
