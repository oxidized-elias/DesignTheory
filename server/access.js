import { createHash, timingSafeEqual } from 'node:crypto';

function hostname(value) {
  if (typeof value !== 'string' || !value || /[\s,\\/@?#*%]/.test(value)) throw Error('Invalid domain or Host header.');
  const url = new URL(`http://${value}`);
  if (url.pathname !== '/' || url.username || url.password) throw Error('Invalid domain or Host header.');
  return url.hostname.toLowerCase().replace(/\.$/, '');
}

export function createAccessPolicy(env = process.env) {
  if (env.LOCKED_MODE && !['true', 'false'].includes(env.LOCKED_MODE)) throw Error('LOCKED_MODE must be true or false.');
  const domains = (env.LOCKED_DOMAINS || '').split(',').map(value => value.trim()).filter(Boolean).map(hostname);
  const token = env.WRITE_TOKEN || '';
  if (token && (token.length < 32 || /\s/.test(token))) throw Error('WRITE_TOKEN must contain at least 32 characters without whitespace.');
  const globallyLocked = env.LOCKED_MODE === 'true';
  const protectedWrites = domains.length > 0 || !!token;
  const digest = value => createHash('sha256').update(value).digest();
  return req => {
    let locked = globallyLocked;
    try {
      const host = hostname(req.get('host'));
      locked ||= domains.some(domain => host === domain || host.endsWith(`.${domain}`));
      // Check both browser provenance headers; forwarded headers never grant access.
      for (const header of ['origin', 'referer']) {
        const value = req.get(header);
        if (!value) continue;
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) throw Error('Invalid origin.');
        const source = hostname(url.host);
        locked ||= domains.some(domain => source === domain || source.endsWith(`.${domain}`));
        if (source !== host) locked = true;
      }
    } catch { locked = true; }
    if (req.get('sec-fetch-site') === 'cross-site') locked = true;
    const supplied = req.get('authorization') || '';
    const authorized = !protectedWrites || (!!token && timingSafeEqual(digest(supplied), digest(`Bearer ${token}`)));
    return {locked, canWrite: !locked && authorized, authenticationRequired: !locked && !!token};
  };
}

export function accessGuard(policy) {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const access = policy(req);
    if (req.path === '/access' && req.method === 'GET') return res.json(access);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !access.canWrite) {
      return res.status(403).json({error: access.locked ? 'Locked mode: this address is read-only.' : 'Writes require the host-configured write token.'});
    }
    next();
  };
}
