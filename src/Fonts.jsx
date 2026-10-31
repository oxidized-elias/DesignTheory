import React,{useEffect,useId,useState} from 'react';
import {Button,IconButton,TextField,Tooltip} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import {readFile} from './api';
export function FontSample({font,compact=false}) {
 const id=useId().replace(/:/g,'');const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{setLoaded(false);setFailed(false);if(!font.file)return;let live=true;const face=new FontFace(`dt-${id}`,`url(${font.file})`);face.load().then(f=>{if(live){document.fonts.add(f);setLoaded(true);}}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;document.fonts.delete(face);};},[font.file,id]);
 const family=loaded?`dt-${id}`:`${JSON.stringify(font.family || 'Georgia')}, serif`;
 return <div className={'font-sample '+(compact?'compact':'')}><span className="font-label">{font.role||'Font'} · {font.family||'Choose a family'}{failed?' · file could not load':font.file?(loaded?' · uploaded':' · loading…'):' · local preview'}</span><div style={{fontFamily:family,fontSize:font.role?.toLowerCase()==='body'?16:compact?24:30}}>{font.sample||'The art of a good idea.'}</div></div>;
}
export function FontPreview({fonts,compact=false}) {return <div className={'font-preview '+(compact?'compact':'')}>{(compact?fonts.slice(0,2):fonts).map((font,i)=><FontSample key={i} font={font} compact={compact}/>)}{!fonts.length&&<p className="muted">Add fonts to build your pairing.</p>}</div>;}
export function FontEditor({fonts,onChange,onError}) {
 const update=(i,patch)=>onChange(fonts.map((font,j)=>j===i?{...font,...patch}:font));
 const upload=async(i,file)=>{if(!file)return;try{const ext=file.name.split('.').pop().toLowerCase();if(!['woff','woff2','ttf','otf'].includes(ext))throw Error('Choose a WOFF, WOFF2, TTF, or OTF font file.');if(file.size>3*1024*1024)throw Error('Choose a font file under 3 MB.');const data=await readFile(file);update(i,{file:data.replace(/^data:[^;]*;/,`data:font/${ext};`)});}catch(e){onError(e.message);}};
 return <><div className="field-heading"><b>Fonts ({fonts.length})</b><Button startIcon={<Add/>} onClick={()=>onChange([...fonts,{family:'',role:fonts.length?'Body':'Heading',sample:'',file:''}])}>Add font</Button></div><p className="helper">Name any font family. Upload a font file for an exact preview; otherwise your device’s installed fonts are used, with a serif fallback.</p>{fonts.map((font,i)=><div className="font-editor" key={i}><div className="font-editor-row"><TextField fullWidth label="Font family" required value={font.family} onChange={e=>update(i,{family:e.target.value})}/><TextField label="Role" value={font.role} onChange={e=>update(i,{role:e.target.value})}/><IconButton aria-label={`Remove font ${i+1}`} onClick={()=>onChange(fonts.filter((_,j)=>j!==i))}><Close/></IconButton></div><TextField fullWidth label="Preview text" value={font.sample} onChange={e=>update(i,{sample:e.target.value})}/><div className="cover-actions"><Button size="small" component="label" startIcon={<UploadFileOutlined/>}>{font.file?'Replace font file':'Upload font file'}<input type="file" hidden accept=".woff,.woff2,.ttf,.otf" onChange={e=>upload(i,e.target.files?.[0])}/></Button>{font.file&&<Button size="small" onClick={()=>update(i,{file:''})}>Remove file</Button>}</div><FontSample font={font}/></div>)}</>;
}
