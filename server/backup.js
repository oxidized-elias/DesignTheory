import {randomUUID,createHash} from 'node:crypto';
import {validateRecord} from './validation.js';
const collections=[['palettes','palettes'],['font-pairings','font_pairings']];
export function normalizeBackup(input) {
  if(Array.isArray(input)) return {palettes:input,'font-pairings':[]};
  if(!input || typeof input!=='object' || input.app!=='DesignTheory' || input.version!==2 || !Array.isArray(input.palettes) || !Array.isArray(input['font-pairings'])) throw Error('Choose a DesignTheory version 2 backup or a legacy palette export (JSON array).');
  return input;
}
const fingerprint=record=>createHash('sha256').update(JSON.stringify(validateRecord(record,record.fonts?'font-pairings':'palettes'))).digest('hex');
export function importBackup(db,input,{preview=false}={}) {
  const backup=normalizeBackup(input),now=new Date().toISOString();
  // Validate the whole file before beginning any database writes.
  const prepared=collections.map(([kind,table])=>({kind,table,records:backup[kind].map((record,index)=>{
    try {
      const value=validateRecord(record,kind);
      if(record.id!==undefined && (typeof record.id!=='string'||!record.id||record.id.length>200))throw Error('Invalid record ID.');
      const date=key=>{if(record[key]===undefined)return now;if(typeof record[key]!=='string'||!Number.isFinite(Date.parse(record[key])))throw Error(`Invalid ${key} timestamp.`);return new Date(record[key]).toISOString();};
      return {...value,id:record.id||randomUUID(),createdAt:date('createdAt'),updatedAt:date('updatedAt')};
    }catch(e){throw Error(`${kind==='palettes'?'Palette':'Font pairing'} ${index+1}: ${e.message}`);}
  })}));
  const summary={palettes:0,'font-pairings':0,skipped:0};
  db.exec('BEGIN IMMEDIATE');
  try {
    for(const {kind,table,records} of prepared){
      const existing=db.prepare(`SELECT id,document FROM ${table}`).all();
      const ids=new Set(existing.map(row=>row.id));const contents=new Set(existing.map(row=>fingerprint(JSON.parse(row.document))));
      for(const record of records){const hash=fingerprint(record);if(ids.has(record.id)||contents.has(hash)){summary.skipped++;continue;}ids.add(record.id);contents.add(hash);summary[kind]++;if(!preview)db.prepare(`INSERT INTO ${table} VALUES (?,?)`).run(record.id,JSON.stringify(record));}
    }
    db.exec(preview?'ROLLBACK':'COMMIT');return summary;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
