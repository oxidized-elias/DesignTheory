export function postResultsBackup(results,{includeThumbnails=true}={}) {
  const backup={app:'DesignTheory',version:2,palettes:[],'font-pairings':[]};
  for(const result of results){
    if(!['palettes','font-pairings'].includes(result.kind))throw Error('An import result has an unknown type. Review or discard it before saving.');
    const {kind,importKey,id,createdAt,updatedAt,sourceImage,...record}=result;
    record.cover=includeThumbnails?(sourceImage||record.cover||''):'';
    backup[kind].push(record);
  }
  return backup;
}

export function photoResults({name,image,colors,folderId,source,analysis},{importColors=true,importFonts=true,detectPalettes=true,thumbnails=true}={}){
  const makeKey=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
  const base={folderId:folderId||'',cover:thumbnails?image:'',sourceImage:image,links:source?[source]:[],favorite:false};
  const results=[];
  if(importColors){
    const detected=detectPalettes?(analysis?.palettes||[]):[];
    if(!detected.length)results.push({...base,name:`${name} — colors`.slice(0,200),description:`From ${name}. Review extracted colors before saving.`,colors,kind:'palettes',importKey:makeKey()});
    for(const [i,palette] of detected.entries())results.push({...base,...palette,name:`${name} — ${palette.name}`.slice(0,200),description:`Visual palette suggestion ${i+1} from ${name}; verify colors against the image.`,kind:'palettes',importKey:makeKey()});
  }
  if(importFonts)for(const pairing of analysis?.pairings||[])results.push({...base,...pairing,name:`${name} — ${pairing.name}`.slice(0,200),description:`Font suggestions from ${name}. Visually estimated or read from labels; verify family names before use. Font files are not extracted from images.`,kind:'font-pairings',importKey:makeKey()});
  return results;
}
