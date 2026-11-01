import React from 'react';
import {Button,IconButton,TextField} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
export const validHex=color=>/^#[\da-f]{6}$/i.test(color);
export default function ImportColors({colors,onChange,disabled=false}){
 const update=(index,value)=>onChange(colors.map((color,i)=>i===index?value:color));
 return <div className="import-color-editor"><div className="result-swatches">{colors.map((color,i)=><span key={i} style={{background:validHex(color)?color:'transparent'}} title={color}/>)}</div><div className="import-color-fields">{colors.map((color,i)=><div key={i}><input type="color" aria-label={`Pick imported color ${i+1}`} disabled={disabled} value={validHex(color)?color:'#000000'} onChange={e=>update(i,e.target.value.toUpperCase())}/><TextField label={`Color ${i+1}`} value={color} disabled={disabled} error={!validHex(color)} onChange={e=>update(i,e.target.value)} onBlur={()=>{if(validHex(color))update(i,color.toUpperCase());}} placeholder="#RRGGBB" slotProps={{htmlInput:{'aria-label':`Imported hex color ${i+1}`}}}/><IconButton disabled={disabled} aria-label={`Remove imported color ${i+1}`} onClick={()=>onChange(colors.filter((_,j)=>j!==i))}><Close fontSize="small"/></IconButton></div>)}</div><div className="import-color-footer"><span className="helper">{colors.length} colors · {colors.length?'Edit a hex code or pick a color.':'Add at least one color before saving.'}</span><Button disabled={disabled} size="small" startIcon={<Add/>} onClick={()=>onChange([...colors,'#000000'])}>Add color</Button></div>{colors.some(color=>!validHex(color))&&<p className="helper" role="status">Use six-digit hex codes, such as #EFC07B.</p>}</div>;
}
