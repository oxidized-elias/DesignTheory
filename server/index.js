import { createApp } from './app.js';
const {app,db}=createApp();
const server=app.listen(Number(process.env.PORT || 3001),process.env.HOST || '0.0.0.0',()=>console.log(`DesignTheory running on http://localhost:${process.env.PORT || 3001}`));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
