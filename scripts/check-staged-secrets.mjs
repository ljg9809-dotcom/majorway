import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const git=args=>{const r=spawnSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,maxBuffer:100*1024*1024,windowsHide:true});if(r.status!==0)throw new Error('Git index inspection failed');return r.stdout;};
const files=git(['ls-files','-z']).toString().split('\0').filter(Boolean);
const secrets=new Set();
for(const name of ['BUSAN_API_KEY','WORK24_API_KEY','UNIVERSITY_API_KEY']){
 const raw=process.env[name]?.trim();if(!raw)continue;
 const variants=[raw];try{variants.push(decodeURIComponent(raw));}catch{}
 for(const v of variants){if(v.length<10)continue;secrets.add(v);secrets.add(encodeURIComponent(v));}
}
const failures=[];
for(const file of files){
 if(/(^|\/)\.env(?:\.|$)/.test(file)&&!file.endsWith('.env.example')){failures.push(file);continue;}
 let body=git(['show',':'+file]);
 if(file.endsWith('.gz')){try{body=gunzipSync(body,{maxOutputLength:100*1024*1024});}catch{throw new Error('Compressed source inspection failed');}}
 if([...secrets].some(secret=>body.includes(Buffer.from(secret))))failures.push(file);
}
if(failures.length){console.error('Secret check failed. Remove private credentials from these staged files:');for(const f of failures)console.error(f);process.exitCode=1;}
else console.log(`PASS: ${files.length} staged files checked; private .env files excluded and registered API key values not found.`);
