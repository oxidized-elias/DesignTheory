import React,{useEffect,useRef,useState} from 'react';
import {Dialog,DialogTitle,DialogContent,DialogActions,Button,TextField,Alert,Checkbox,FormControlLabel,LinearProgress,IconButton,Chip,Tabs,Tab,Switch} from '@mui/material';
import Close from '@mui/icons-material/Close';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import DoneAll from '@mui/icons-material/DoneAll';
import {readFile,request} from './api';
import {prepareImage} from './colors';
import {FontPreview} from './Fonts';
import ImportColors,{validHex} from './ImportColors';
import {postResultsBackup,photoResults} from './post-results';
export default function Importer({open,onClose,onReview,onSavedAll,onFolderCreated,savedKey,onOpenSettings,settingsVersion}) {
 const [url,setUrl]=useState(''),[photos,setPhotos]=useState([]),[results,setResults]=useState([]),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[vision,setVision]=useState(false),[analyzeDesigns,setAnalyzeDesigns]=useState(true),[importColors,setImportColors]=useState(true),[importFonts,setImportFonts]=useState(true),[thumbnails,setThumbnails]=useState(true),[postName,setPostName]=useState(''),[postFolder,setPostFolder]=useState(null),[selected,setSelected]=useState(new Set()),[resultTab,setResultTab]=useState('all'),[savingAll,setSavingAll]=useState(false);
 const locked=busy||savingAll;
 const stopped=useRef(false);
 const formVersion=useRef(0);
 const done=()=>{
   if(locked)return;
   formVersion.current++;
   setUrl('');setPhotos([]);setResults([]);setMessages([]);setProgress('');
   setPostName('');setPostFolder(null);setSelected(new Set());setResultTab('all');
   setImportColors(true);setImportFonts(true);setThumbnails(true);setAnalyzeDesigns(true);
   stopped.current=false;
   onClose();
 };
 const eligible=results.filter(r=>r.kind==='palettes'?importColors:importFonts);
 const shown=eligible.filter(r=>resultTab==='all'||r.kind===resultTab);
 const selectedResults=eligible.filter(r=>selected.has(r.importKey));
 const invalidSelected=selectedResults.some(r=>r.kind==='palettes'&&(!r.name.trim()||!r.colors.length||r.colors.some(color=>!validHex(color))));
 const updateResult=(id,patch)=>setResults(old=>old.map(result=>result.importKey===id?{...result,...patch}:result));
 const shownSelected=shown.filter(r=>selected.has(r.importKey)).length;
 const canExtract=importColors||(importFonts&&vision);
 const toggle=id=>setSelected(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});
 const removeResults=ids=>{setResults(old=>old.filter(r=>!ids.has(r.importKey)));setSelected(old=>new Set([...old].filter(id=>!ids.has(id))));};
 const saveAll=async()=>{
   if(locked||!selectedResults.length||invalidSelected)return;
   setSavingAll(true);
   try{
     const summary=await request('library/import',{method:'POST',body:JSON.stringify({backup:postResultsBackup(selectedResults,{includeThumbnails:thumbnails})})});
     removeResults(new Set(selectedResults.map(r=>r.importKey)));
     setProgress(`Saved ${summary.palettes} palettes and ${summary['font-pairings']} font pairings. ${summary.skipped} duplicates skipped.`);
     onSavedAll?.(summary);
   }catch(e){setMessages(old=>[...old,`Could not save the selected results: ${e.message} Your results and selection are still here; review them or retry.`]);}
   finally{setSavingAll(false);}
 };
 useEffect(()=>{let active=true;if(open)request('import/status').then(s=>{if(active)setVision(s.vision);}).catch(()=>{if(active)setMessages(['Could not check the vision service. Local color extraction is still available.']);});return()=>{active=false;};},[open,settingsVersion]);
 useEffect(()=>{if(savedKey)removeResults(new Set([savedKey]));},[savedKey]);
 const upload=async event=>{const version=formVersion.current;const files=[...event.target.files];event.target.value='';try{for(const file of files){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose PNG, JPEG, or WebP photos.');if(file.size>20*1024*1024)throw Error('Choose photos under 20 MB each.');}const loaded=await Promise.all(files.map(async file=>({name:file.name,image:await readFile(file)})));if(version===formVersion.current)setPhotos(old=>[...old,...loaded]);}catch(e){if(version===formVersion.current)setMessages([e.message]);}};
 const generate=async fromUrl=>{
   if(!canExtract)return;
   stopped.current=false;setBusy(true);setResults([]);setSelected(new Set());setResultTab('all');setMessages([]);setProgress(fromUrl?'Preparing Instagram support and fetching all post photos…':'Preparing photos…');
   let processed=0;
   try {
     let images=photos;let source=url.trim();
     if(source&&(!/^https?:\/\//i.test(source)||!URL.canParse(source)))throw Error('Use a full source URL starting with https://.');
     if(fromUrl){let post;let polling=true;const timer=setInterval(()=>{request('import/status').then(status=>{if(polling)setProgress(status.instagramSetup?.state==='ready'?'Fetching all post photos…':status.instagramSetup?.message||'Preparing Instagram support…');}).catch(()=>{});},1500);
       try{post=await request('import/instagram',{method:'POST',body:JSON.stringify({url:source})});}finally{polling=false;clearInterval(timer);}
       images=post.images;source=post.url;setUrl(source);setPhotos(images);if(post.skippedVideos)setMessages([`${post.skippedVideos} video slide(s) skipped. All ${images.length} photos will be processed.`]);}
     if(!images.length)throw Error('Add all photos from the post, or fetch an Instagram URL.');
     const name=postName.trim()||(source?`Post · ${new URL(source).pathname.split('/').filter(Boolean).pop()||new URL(source).hostname}`:`Post · ${new Date().toLocaleString()}`);
     const folder=postFolder?.source===source&&postFolder?.name===name?postFolder:await request('folders',{method:'POST',body:JSON.stringify({name,source})});
     setPostFolder(folder);setPostName(folder.name);onFolderCreated?.(folder);
     for(let i=0;i<images.length;i++){
       if(stopped.current)break;
       const photo=images[i];setProgress(`Photo ${i+1} of ${images.length} · ${importColors?'extracting colors':''}${importColors&&importFonts&&vision?' and ':''}${importFonts&&vision?'finding font pairings':''}…`);
       let prepared;try{prepared=await prepareImage(photo.image);}catch{setMessages(old=>[...old,`${photo.name}: could not decode this image. It was not imported.`]);continue;}
       let analysis;
       if(vision&&(importFonts||(importColors&&analyzeDesigns))){
         try{analysis=await request('import/analyze',{method:'POST',body:JSON.stringify({image:prepared.image})});if(importFonts&&!analysis.pairings.length)setMessages(old=>[...old,`${photo.name}: no font pairings detected.`]);}
         catch(e){setMessages(old=>[...old,`${photo.name}: ${e.message}${importColors?' Sampled colors are available.':''}`]);}
       }
       const candidates=photoResults({name:photo.name,image:prepared.image,colors:prepared.colors,folderId:folder.id,source,analysis},{importColors,importFonts,detectPalettes:analyzeDesigns,thumbnails});
       setResults(old=>[...old,...candidates]);setSelected(old=>new Set([...old,...candidates.map(r=>r.importKey)]));processed++;
     }
     setProgress(`${stopped.current?'Stopped. ':''}Processed ${processed} of ${images.length} photos. Select results to save into “${folder.name}”.`);
   }catch(e){setMessages(old=>[...old,e.message]);setProgress('Import did not complete.');}finally{setBusy(false);}
 };
 return <Dialog open={open} onClose={()=>!locked&&onClose()} fullWidth maxWidth="md">
 <DialogTitle className="dialog-heading">Import inspiration<IconButton aria-label="Close import" disabled={locked} onClick={onClose}><Close/></IconButton></DialogTitle>
 <DialogContent><p className="helper">Import all photos from a post into one folder. Choose what to extract, then select the results you want to keep.</p>
 <div className="import-url"><TextField fullWidth label="Instagram post / source URL" placeholder="https://www.instagram.com/p/…/" value={url} disabled={locked} onChange={e=>{setUrl(e.target.value);setPostName('');setPostFolder(null);}}/><Button variant="outlined" disabled={locked||!url.trim()||!canExtract} onClick={()=>generate(true)}>Fetch & extract</Button></div>
 <TextField fullWidth sx={{mt:2}} label="Post folder name (automatic if empty)" value={postName} disabled={locked} onChange={e=>setPostName(e.target.value)} slotProps={{htmlInput:{maxLength:200}}}/>
 <div className="import-options"><FormControlLabel control={<Switch checked={importColors} disabled={locked} onChange={e=>{setImportColors(e.target.checked);if(!e.target.checked&&resultTab==='palettes')setResultTab('all');}}/>} label="Import colors"/><FormControlLabel control={<Switch checked={importFonts} disabled={locked} onChange={e=>{setImportFonts(e.target.checked);if(!e.target.checked&&resultTab==='font-pairings')setResultTab('all');}}/>} label="Import fonts"/><FormControlLabel control={<Switch checked={thumbnails} disabled={locked} onChange={e=>setThumbnails(e.target.checked)}/>} label="Create photo thumbnails"/></div>
 <p className="helper">{thumbnails?'Saved entries use their source photo as a cover.':'Saved entries use color swatches or font previews instead of a photo cover.'}</p>
 <Alert severity="info" sx={{my:2}}>The first import may take longer while Instagram support is prepared automatically. If Instagram blocks fetching, upload all carousel photos below and keep the URL for attribution.</Alert>
 <Button component="label" startIcon={<UploadFileOutlined/>} disabled={locked}>Add post photos<input type="file" multiple hidden accept="image/png,image/jpeg,image/webp" onChange={upload}/></Button>
 {!!photos.length&&<div className="import-photos">{photos.map((photo,i)=><div key={i}><img src={photo.image} alt={photo.name}/><span>{i+1}. {photo.name}</span><IconButton disabled={locked} aria-label={`Remove ${photo.name}`} onClick={()=>setPhotos(old=>old.filter((_,j)=>j!==i))}><Close fontSize="small"/></IconButton></div>)}</div>}
 {importColors&&<FormControlLabel control={<Checkbox checked={analyzeDesigns} disabled={!vision||locked} onChange={e=>setAnalyzeDesigns(e.target.checked)}/>} label="Detect separate designed palettes with vision"/>}
 {!vision&&(importFonts||(importColors&&analyzeDesigns))&&<Alert severity="info" sx={{mb:2}} action={<Button disabled={locked} onClick={onOpenSettings}>Open settings</Button>}>Choose an Ollama vision model in Settings for automatic font extraction and separate-palette detection. Color sampling works without it. {importFonts&&!importColors?'Enable Import colors or configure vision to continue.':''}</Alert>}
 {vision&&<p className="helper">Images are sent to your configured vision server. Font names are suggestions to verify; font files cannot be extracted from photos.</p>}
 <Button variant="contained" disabled={locked||!photos.length||!canExtract} onClick={()=>generate(false)}>Extract from all {photos.length||''} photos</Button>
 {busy&&<LinearProgress sx={{mt:2}}/>}{progress&&<p role="status" className="helper">{progress}</p>}{messages.map((message,i)=><Alert severity="warning" sx={{mt:1}} key={i}>{message}</Alert>)}
 {!!results.length&&<><Tabs value={resultTab} onChange={(_,value)=>setResultTab(value)} variant="scrollable" aria-label="Import result type"><Tab value="all" label={`All (${eligible.length})`}/><Tab value="palettes" label={`Colors (${eligible.filter(r=>r.kind==='palettes').length})`}/><Tab value="font-pairings" label={`Fonts (${eligible.filter(r=>r.kind==='font-pairings').length})`}/></Tabs>
 {eligible.length<results.length&&<p className="helper">{results.length-eligible.length} results hidden by the import toggles; they will not be saved.</p>}
 <div className="selection-toolbar"><FormControlLabel control={<Checkbox disabled={locked||!shown.length} checked={!!shown.length&&shownSelected===shown.length} indeterminate={shownSelected>0&&shownSelected<shown.length} onChange={e=>setSelected(old=>{const next=new Set(old);shown.forEach(r=>e.target.checked?next.add(r.importKey):next.delete(r.importKey));return next;})}/>} label={`Select all shown (${shown.length})`}/><Button variant="contained" startIcon={<DoneAll/>} disabled={locked||!selectedResults.length||invalidSelected} onClick={saveAll}>{savingAll?'Saving…':`${selectedResults.length===eligible.length?'Save all':'Save selected'} (${selectedResults.length})`}</Button></div>
 <p className="helper">{selectedResults.length} selected across all result tabs.</p>{invalidSelected&&<Alert severity="warning">Complete the names and hex colors in the selected palettes before saving.</Alert>}<div className="import-results">{shown.map(result=><article key={result.importKey} className={'import-result '+(selected.has(result.importKey)?'is-selected':'')}><div className="import-source"><Checkbox checked={selected.has(result.importKey)} disabled={locked} onChange={()=>toggle(result.importKey)} inputProps={{'aria-label':`Select ${result.name}`}}/><img src={result.sourceImage||result.cover} alt="Source photo"/></div><div><Chip size="small" label={result.kind==='palettes'?'Color palette':'Font pairing · suggestion'}/>{result.kind==='palettes'?<><TextField fullWidth label="Palette name" value={result.name} disabled={locked} error={!result.name.trim()} onChange={e=>updateResult(result.importKey,{name:e.target.value})} slotProps={{htmlInput:{maxLength:200}}} sx={{my:2}}/><ImportColors colors={result.colors} disabled={locked} onChange={colors=>updateResult(result.importKey,{colors})}/></>:<><h4>{result.name}</h4><FontPreview fonts={result.fonts} compact/></>}<div className="import-result-actions"><Button disabled={locked} onClick={()=>onReview({...result,cover:thumbnails?(result.sourceImage||result.cover):''})}>Review & save</Button><Button disabled={locked} color="inherit" onClick={()=>removeResults(new Set([result.importKey]))}>Discard</Button></div></div></article>)}</div></>}
 </DialogContent><DialogActions>{savingAll?<Button disabled>Saving selected results…</Button>:busy?<Button onClick={()=>{stopped.current=true;setProgress('Stopping after the current photo…');}}>Stop after this photo</Button>:<Button onClick={done}>Done</Button>}</DialogActions></Dialog>;
}
