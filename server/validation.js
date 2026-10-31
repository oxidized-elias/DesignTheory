export const imagePattern = /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i;
export const fontPattern = /^data:(font\/(woff2?|ttf|otf)|application\/(font-woff|octet-stream|x-font-ttf|vnd\.ms-opentype));base64,[a-z\d+/=]+$/i;
export function validateRecord(body, kind = 'palettes') {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200) throw Error('Enter a name of up to 200 characters.');
  if (!Array.isArray(body.links) || body.links.some(link => typeof link !== 'string' || !/^https?:\/\//i.test(link) || !URL.canParse(link))) throw Error('Source links must be valid HTTP or HTTPS URLs.');
  if (body.cover && (typeof body.cover !== 'string' || !imagePattern.test(body.cover) || body.cover.length > 7_000_000)) throw Error('Use a PNG, JPEG, WebP, or GIF cover image under 5 MB.');
  const value = { name: body.name.trim(), description: typeof body.description === 'string' ? body.description.slice(0,5000) : '', links: body.links, cover: body.cover || '', favorite: body.favorite === true };
  if (kind === 'palettes') {
    if (!Array.isArray(body.colors) || !body.colors.length || body.colors.some(c => typeof c !== 'string' || !/^#[\da-f]{6}$/i.test(c))) throw Error('Add at least one valid six-digit hex color.');
    return {...value, colors: body.colors};
  }
  if (!Array.isArray(body.fonts) || !body.fonts.length) throw Error('Add at least one font to this pairing.');
  const fonts = body.fonts.map(font => {
    if (!font || typeof font.family !== 'string' || !font.family.trim() || font.family.length > 150) throw Error('Each font needs a family name of up to 150 characters.');
    if (font.file && (typeof font.file !== 'string' || !fontPattern.test(font.file) || font.file.length > 4_200_000)) throw Error('Use a WOFF, WOFF2, TTF, or OTF font file under 3 MB.');
    return { family: font.family.trim(), role: typeof font.role === 'string' ? font.role.slice(0,100) : '', sample: typeof font.sample === 'string' ? font.sample.slice(0,1000) : '', file: font.file || '' };
  });
  return {...value, fonts};
}
