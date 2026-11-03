import express from 'express';
import {createAccessPolicy,accessGuard} from './access.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateRecord } from './validation.js';
import { importBackup } from './backup.js';
import { instagramPost, analyzeImage } from './import.js';
import { instagramPython } from './python.js';
import {defaultOllamaSettings,readOllamaSettings,saveOllamaSettings,resetOllamaSettings,testOllamaSettings} from './settings.js';
import {createFolder,validateFolder,requireFolder,deleteFolder,bulkUpdate} from './folders.js';

export function createApp(databasePath = process.env.DATABASE_PATH || './data/palettes.sqlite', accessConfig = process.env) {
  const policy = createAccessPolicy(accessConfig);
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS palettes (id TEXT PRIMARY KEY, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS font_pairings (id TEXT PRIMARY KEY, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, document TEXT NOT NULL)');
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next) => {res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});next();});
  app.use('/api', accessGuard(policy));
  app.use('/api/library/import', express.json({limit:'100mb'}));
  app.use(express.json({limit:'32mb'}));
  app.post('/api/library/import', (req,res,next) => {
    try {res.json(importBackup(db,req.body?.backup,{preview:req.body?.preview===true}));}catch(e){next(e);}
  });
  app.get('/api/folders',(req,res)=>res.json(db.prepare('SELECT document FROM folders').all().map(row=>JSON.parse(row.document))));
  app.post('/api/folders',(req,res,next)=>{try{res.status(201).json(createFolder(db,req.body));}catch(e){next(e);}});
  app.put('/api/folders/:id',(req,res,next)=>{try{const row=db.prepare('SELECT document FROM folders WHERE id=?').get(req.params.id);if(!row)return res.status(404).json({error:'Folder not found.'});const folder={...JSON.parse(row.document),...validateFolder(req.body)};db.prepare('UPDATE folders SET document=? WHERE id=?').run(JSON.stringify(folder),req.params.id);res.json(folder);}catch(e){next(e);}});
  app.delete('/api/folders/:id',(req,res,next)=>{try{requireFolder(db,req.params.id);deleteFolder(db,req.params.id);res.status(204).end();}catch(e){next(e);}});
  app.post('/api/library/bulk',(req,res,next)=>{try{res.json(bulkUpdate(db,req.body));}catch(e){next(e);}});
  app.get('/api/settings/ollama/defaults',(req,res)=>res.json(defaultOllamaSettings()));
  app.get('/api/settings/ollama',(req,res)=>res.json(readOllamaSettings(db)));
  app.put('/api/settings/ollama',(req,res,next)=>{try{res.json(saveOllamaSettings(db,req.body));}catch(e){next(e);}});
  app.delete('/api/settings/ollama',(req,res)=>res.json(resetOllamaSettings(db)));
  app.post('/api/settings/ollama/test',async(req,res,next)=>{try{res.json(await testOllamaSettings(req.body));}catch(e){next(e);}});
  app.get('/api/import/status', (req,res) => {const config=readOllamaSettings(db);res.json({vision:config.enabled&&!!config.model,instagramSetup:instagramPython.status()});});
  let importing = false;
  app.post('/api/import/instagram', async (req,res,next) => {
    if (importing) return res.status(409).json({error:'Another post is being fetched. Please try again shortly.'});
    importing = true;
    try { res.json(await instagramPost(req.body?.url)); } catch(e) { next(e); } finally { importing = false; }
  });
  let analyzing = false;
  app.post('/api/import/analyze', async (req,res,next) => {
    if (analyzing) return res.status(409).json({error:'Another image is being analyzed. Please try again shortly.'});
    analyzing = true;
    try { res.json(await analyzeImage(req.body?.image,readOllamaSettings(db))); } catch(e) { next(e); } finally { analyzing = false; }
  });
  for (const [kind, table] of [['palettes','palettes'],['font-pairings','font_pairings']]) {
    // Table names are fixed constants, never request input. Values use bound parameters.
    app.get(`/api/${kind}`, (req,res) => res.json(db.prepare(`SELECT document FROM ${table}`).all().map(row => JSON.parse(row.document))));
    app.post(`/api/${kind}`, (req,res,next) => {
      try {requireFolder(db,req.body?.folderId || '');const now=new Date().toISOString();const value={...validateRecord(req.body,kind),id:randomUUID(),createdAt:now,updatedAt:now}; db.prepare(`INSERT INTO ${table} VALUES (?,?)`).run(value.id,JSON.stringify(value)); res.status(201).json(value);} catch(e){next(e);}
    });
    app.put(`/api/${kind}/:id`, (req,res,next) => {
      try {const row=db.prepare(`SELECT document FROM ${table} WHERE id=?`).get(req.params.id); if(!row)return res.status(404).json({error:'Item not found.'}); const old=JSON.parse(row.document); requireFolder(db,req.body?.folderId || ''); const value={...validateRecord(req.body,kind),id:old.id,createdAt:old.createdAt,updatedAt:new Date().toISOString()}; db.prepare(`UPDATE ${table} SET document=? WHERE id=?`).run(JSON.stringify(value),value.id);res.json(value);}catch(e){next(e);}
    });
    app.delete(`/api/${kind}/:id`,(req,res)=>{const result=db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);res.status(result.changes ? 204 : 404).end();});
  }
  app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.use(express.static(resolve('dist')));
  app.get('/{*path}',(req,res)=>res.sendFile(resolve('dist/index.html')));
  app.use((err,req,res,next)=>res.status(err.status || 400).json({error:err.type === 'entity.too.large' ? 'Request is too large. Reduce the size of uploaded files.' : err.message || 'Request failed.'}));
  return {app,db};
}
