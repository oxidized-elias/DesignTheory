import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postResultsBackup} from '../src/post-results.js';
import {importBackup} from '../server/backup.js';
import {createApp} from '../server/app.js';
const source='https://www.instagram.com/p/test/';
const results=()=>[
 {kind:'palettes',importKey:'photo-1-palette',name:'Photo 1',description:'Sampled colors',colors:['#123456','#ABCDEF'],fonts:[],links:[source],cover:'data:image/png;base64,dGVzdA=='},
 {kind:'palettes',importKey:'photo-2-palette',name:'Photo 2',colors:['#FFEEDD'],links:[source]},
 {kind:'font-pairings',importKey:'photo-2-fonts',name:'Photo 2 typography',fonts:[{family:'Georgia',role:'Heading'},{family:'Arial',role:'Body'}],colors:[],links:[source]}
];
test('save all persists mixed post results with attribution and covers, and retry skips duplicates',()=>{
 const {db}=createApp(':memory:');try{
 const payload=postResultsBackup(results());assert.deepEqual(importBackup(db,payload),{palettes:2,'font-pairings':1,skipped:0});
 const palettes=db.prepare('SELECT document FROM palettes').all().map(row=>JSON.parse(row.document));assert.equal(palettes.length,2);assert.deepEqual(palettes[0].links,[source]);assert.equal(palettes[0].cover,results()[0].cover);assert.ok(!('importKey' in palettes[0]));
 assert.equal(JSON.parse(db.prepare('SELECT document FROM font_pairings').get().document).fonts.length,2);
 assert.deepEqual(importBackup(db,postResultsBackup(results())),{palettes:0,'font-pairings':0,skipped:3});
 }finally{db.close();}
});
test('a bad result prevents partial batch saves and leaves the original results available for correction',()=>{
 const {db}=createApp(':memory:');try{const original=results();original[2].fonts=[];const before=structuredClone(original);assert.throws(()=>importBackup(db,postResultsBackup(original)),/Font pairing/);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM palettes').get().n,0);assert.deepEqual(original,before);original[2].fonts=[{family:'Georgia'}];assert.equal(importBackup(db,postResultsBackup(original)).palettes,2);assert.throws(()=>postResultsBackup([{kind:'unknown'}]),/unknown type/);}finally{db.close();}
});
