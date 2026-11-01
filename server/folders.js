import {randomUUID} from 'node:crypto';
const collections=[['palettes','palettes'],['font-pairings','font_pairings']];
export function validateFolder(body){
 if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>200)throw Error('Enter a folder name of up to 200 characters.');
 let source=body.source||'';
 if(typeof source!=='string'||source&&(!/^https?:\/\//i.test(source)||!URL.canParse(source)))throw Error('Folder sources must be valid HTTP or HTTPS URLs.');
 if(source){const url=new URL(source);const post=url.pathname.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);if(['instagram.com','www.instagram.com'].includes(url.hostname)&&post)source=`https://www.instagram.com/p/${post[1]}/`;}
 return {name:body.name.trim(),source};
}
export function folderExists(db,id){return !id||!!db.prepare('SELECT id FROM folders WHERE id=?').get(id);}
export function requireFolder(db,id){if(!folderExists(db,id))throw Error('Folder not found. Choose an existing folder.');}
export function createFolder(db,body){
 const data=validateFolder(body);
 if(data.source){const existing=db.prepare('SELECT document FROM folders').all().map(row=>JSON.parse(row.document)).find(f=>f.source===data.source);if(existing)return existing;}
 const folder={...data,id:randomUUID(),createdAt:new Date().toISOString()};
 db.prepare('INSERT INTO folders VALUES (?,?)').run(folder.id,JSON.stringify(folder));return folder;
}
export function deleteFolder(db,id){
 requireFolder(db,id);db.exec('BEGIN IMMEDIATE');
 try{for(const [,table] of collections){for(const row of db.prepare(`SELECT id,document FROM ${table}`).all()){const record=JSON.parse(row.document);if(record.folderId===id){record.folderId='';db.prepare(`UPDATE ${table} SET document=? WHERE id=?`).run(JSON.stringify(record),row.id);}}}db.prepare('DELETE FROM folders WHERE id=?').run(id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
export function bulkUpdate(db,body){
 const table=collections.find(([kind])=>kind===body?.kind)?.[1];
 if(!table||!Array.isArray(body.ids)||!body.ids.length||body.ids.some(id=>typeof id!=='string')||!['delete','move','favorite'].includes(body.action))throw Error('Choose library items and a valid bulk action.');
 if(body.action==='move'){if(typeof body.folderId!=='string')throw Error('Choose a destination folder.');requireFolder(db,body.folderId);}
 if(body.action==='favorite'&&typeof body.favorite!=='boolean')throw Error('Choose a favorite setting.');
 db.exec('BEGIN IMMEDIATE');
 try{const records=[...new Set(body.ids)].map(id=>{const row=db.prepare(`SELECT document FROM ${table} WHERE id=?`).get(id);if(!row)throw Error('One of the selected items no longer exists. Refresh and try again.');return JSON.parse(row.document);});
 for(const record of records){if(body.action==='delete')db.prepare(`DELETE FROM ${table} WHERE id=?`).run(record.id);else{if(body.action==='move')record.folderId=body.folderId;else record.favorite=body.favorite;record.updatedAt=new Date().toISOString();db.prepare(`UPDATE ${table} SET document=? WHERE id=?`).run(JSON.stringify(record),record.id);}}
 db.exec('COMMIT');return {updated:records.length};}catch(e){db.exec('ROLLBACK');throw e;}
}
