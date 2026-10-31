import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDesignTheme} from '../src/theme.js';
function luminance(hex){const values=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
test('custom surfaces and Material UI receive the same mode, including toggling back to light',()=>{
 for(const mode of [false,true,false]){
 const theme=createDesignTheme(mode);const tokens=theme.components.MuiCssBaseline.styleOverrides[':root'];
 assert.equal(theme.palette.mode,mode?'dark':'light');assert.equal(tokens.colorScheme,theme.palette.mode);
 assert.equal(tokens['--c-efeee8'],mode?'#242b25':'#efeee8');
 for(const background of ['--c-efeee8','--c-f2f3ec','--c-fafaf7','--c-fcfcf9']) assert.ok(contrast(theme.palette.text.primary,tokens[background])>=4.5,`${background} must have readable main text`);
 if(mode)for(const [foreground,background] of [['--c-747c70','--c-efeee8'],['--c-8d9585','--c-f2f3ec'],['--c-93988d','--c-fcfcf9']])assert.ok(contrast(tokens[foreground],tokens[background])>=4.5,`${foreground} must have readable secondary text`);
 }
});
