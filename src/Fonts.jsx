import React,{useEffect,useId,useState} from 'react';
import {Button,IconButton,TextField,Tooltip} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import {readFile} from './api';
import {googleFonts,googleFontLinks,normalizeFamily} from './google-fonts';
export function FontSample({font,compact=false}) {
 const id=useId().replace(/:/g,'');
 const [preview,setPreview]=useState({status:'empty',family:'',error:''}),[retry,setRetry]=useState(0);
 const name=normalizeFamily(font.family),sample=font.sample||'The art of a good idea.',links=googleFontLinks(name);
 useEffect(()=>{
  let active=true,face;
  if(!font.file&&!name){setPreview({status:'empty',family:'',error:''});return;}
  setPreview(old=>!font.file&&old.status==='ready'&&old.family===name?old:{status:'loading',family:'',error:''});
  const timer=setTimeout(async()=>{
   try{
    let family;
    if(font.file){face=new FontFace(`dt-${id}`,`url(${font.file})`);const loaded=await face.load();if(!active)return;document.fonts.add(loaded);family=`dt-${id}`;}
    else family=await googleFonts.load(name,sample);
    if(active)setPreview({status:'ready',family,error:''});
   }catch(error){if(active)setPreview({status:'error',family:'',error:error.message||'Could not load this font.'});}
  },font.file?0:350);
  return()=>{active=false;clearTimeout(timer);if(face)document.fonts.delete(face);};
 },[font.file,name,sample,id,retry]);
 const source=font.file?'uploaded font':'Google Fonts';
 const status=preview.status==='ready'?source:preview.status==='loading'?`loading ${source}…`:preview.status==='error'?'preview unavailable':'choose a family';
 // Use the named face only after a cloud or uploaded face actually loaded.
 const family=preview.status==='ready'?JSON.stringify(preview.family):'serif';
 const downloadName=(name||'font').replace(/[^a-z0-9_-]/gi,'_')+'.'+(font.file?.match(/^data:font\/(woff2?|ttf|otf);/)?.[1]||'otf');
 return <div className={'font-sample '+(compact?'compact':'')}><span className="font-label">{font.role||'Font'} · {name||'Choose a family'} · {status}</span><div style={{fontFamily:family,fontSize:font.role?.toLowerCase()==='body'?16:compact?24:30}}>{sample}</div>{!compact&&<><div className="font-source-actions">{font.file?<Button size="small" component="a" href={font.file} download={downloadName} startIcon={<DownloadOutlined/>}>Download font file</Button>:links&&<><Tooltip title="Open Google Fonts, choose Get font, then Download all for the full family"><Button size="small" component="a" href={links.specimen} target="_blank" rel="noopener noreferrer" startIcon={<DownloadOutlined/>}>Download from Google Fonts</Button></Tooltip><Button size="small" component="a" href={links.search} target="_blank" rel="noopener noreferrer">Find family</Button></>}{preview.status==='error'&&<Button size="small" onClick={()=>{if(!font.file)googleFonts.invalidate(name);setRetry(value=>value+1);}}>Retry preview</Button>}</div>{preview.status==='error'&&<p className="helper" role="status">{preview.error} Choose a Google Fonts family or use an uploaded font file; the sample above is a fallback.</p>}</>}</div>;
}
export function FontPreview({fonts,compact=false}) {return <div className={'font-preview '+(compact?'compact':'')}>{(compact?fonts.slice(0,2):fonts).map((font,i)=><FontSample key={i} font={font} compact={compact}/>)}{!fonts.length&&<p className="muted">Add fonts to build your pairing.</p>}</div>;}
export function FontEditor({fonts,onChange,onError}) {
 const update=(i,patch)=>onChange(fonts.map((font,j)=>j===i?{...font,...patch}:font));
 const upload=async(i,file)=>{if(!file)return;try{const ext=file.name.split('.').pop().toLowerCase();if(!['woff','woff2','ttf','otf'].includes(ext))throw Error('Choose a WOFF, WOFF2, TTF, or OTF font file.');if(file.size>3*1024*1024)throw Error('Choose a font file under 3 MB.');const data=await readFile(file);update(i,{file:data.replace(/^data:[^;]*;/,`data:font/${ext};`)});}catch(e){onError(e.message);}};
 return <><div className="field-heading"><b>Fonts ({fonts.length})</b><Button startIcon={<Add/>} onClick={()=>onChange([...fonts,{family:'',role:fonts.length?'Body':'Heading',sample:'',file:''}])}>Add font</Button></div><p className="helper">Enter a Google Fonts family to preview it from the cloud—no font installation required. Use Download from Google Fonts to get the full family. Uploaded files are also supported.</p>{fonts.map((font,i)=><div className="font-editor" key={i}><div className="font-editor-row"><TextField fullWidth label="Font family" required value={font.family} onChange={e=>update(i,{family:e.target.value})}/><TextField label="Role" value={font.role} onChange={e=>update(i,{role:e.target.value})}/><IconButton aria-label={`Remove font ${i+1}`} onClick={()=>onChange(fonts.filter((_,j)=>j!==i))}><Close/></IconButton></div><TextField fullWidth label="Preview text" value={font.sample} onChange={e=>update(i,{sample:e.target.value})}/><div className="cover-actions"><Button size="small" component="label" startIcon={<UploadFileOutlined/>}>{font.file?'Replace font file':'Upload font file'}<input type="file" hidden accept=".woff,.woff2,.ttf,.otf" onChange={e=>upload(i,e.target.files?.[0])}/></Button>{font.file&&<Button size="small" onClick={()=>update(i,{file:''})}>Remove file</Button>}</div><FontSample font={font}/></div>)}</>;
}
