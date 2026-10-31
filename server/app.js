import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateRecord } from './validation.js';
import { importBackup } from './backup.js';
import { instagramPost, analyzeImage } from './import.js';

export function createApp(databasePath = process.env.DATABASE_PATH || './data/palettes.sqlite') {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS palettes (id TEXT PRIMARY KEY, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS font_pairings (id TEXT PRIMARY KEY, document TEXT NOT NULL)');
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/library/import', express.json({limit:'100mb'}));
  app.use(express.json({limit:'32mb'}));
  app.use('/api', (req,res,next) => {
    res.set('Cache-Control','no-store');
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({error:'Cross-site writes are not allowed.'});
    next();
  });
  app.post('/api/library/import', (req,res,next) => {
    try {res.json(importBackup(db,req.body?.backup,{preview:req.body?.preview===true}));}catch(e){next(e);}
  });
  app.get('/api/import/status', (req,res) => res.json({vision:!!process.env.OLLAMA_MODEL}));
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
    try { res.json(await analyzeImage(req.body?.image)); } catch(e) { next(e); } finally { analyzing = false; }
  });
  for (const [kind, table] of [['palettes','palettes'],['font-pairings','font_pairings']]) {
    // Table names are fixed constants, never request input. Values use bound parameters.
    app.get(`/api/${kind}`, (req,res) => res.json(db.prepare(`SELECT document FROM ${table}`).all().map(row => JSON.parse(row.document))));
    app.post(`/api/${kind}`, (req,res,next) => {
      try {const now=new Date().toISOString();const value={...validateRecord(req.body,kind),id:randomUUID(),createdAt:now,updatedAt:now}; db.prepare(`INSERT INTO ${table} VALUES (?,?)`).run(value.id,JSON.stringify(value)); res.status(201).json(value);} catch(e){next(e);}
    });
    app.put(`/api/${kind}/:id`, (req,res,next) => {
      try {const row=db.prepare(`SELECT document FROM ${table} WHERE id=?`).get(req.params.id); if(!row)return res.status(404).json({error:'Item not found.'}); const old=JSON.parse(row.document); const value={...validateRecord(req.body,kind),id:old.id,createdAt:old.createdAt,updatedAt:new Date().toISOString()}; db.prepare(`UPDATE ${table} SET document=? WHERE id=?`).run(JSON.stringify(value),value.id);res.json(value);}catch(e){next(e);}
    });
    app.delete(`/api/${kind}/:id`,(req,res)=>{const result=db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);res.status(result.changes ? 204 : 404).end();});
  }
  app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.use(express.static(resolve('dist')));
  app.get('/{*path}',(req,res)=>res.sendFile(resolve('dist/index.html')));
  app.use((err,req,res,next)=>res.status(err.status || 400).json({error:err.type === 'entity.too.large' ? 'Request is too large. Reduce the size of uploaded files.' : err.message || 'Request failed.'}));
  return {app,db};
}
