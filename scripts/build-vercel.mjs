import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(root,'dist');
fs.mkdirSync(destination,{recursive:true});
// Only public browser files are copied; no server code or secrets enter dist.
for(const name of ['index.html','app.js','style.css'])fs.copyFileSync(path.join(root,'public',name),path.join(destination,name));
console.log('Majorway browser files prepared. API runs as a separate server function.');
