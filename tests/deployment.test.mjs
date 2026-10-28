import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import handler from '../api/index.js';
import {server} from '../server.mjs';
test('GitHub Pages는 실제 서비스로 이동하고 Vercel 정적 출력에는 화면 파일만 포함',()=>{
 const entry=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(entry,/http-equiv="refresh" content="0; url=https:\/\/majorway\.vercel\.app\/"/);
 execFileSync(process.execPath,['scripts/build-vercel.mjs'],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
 const files=fs.readdirSync(new URL('../dist/',import.meta.url)).sort();
 assert.deepEqual(files,['app.js','index.html','style.css']);
 const output=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.ok(output.includes('department-finder'));assert.ok(!output.includes('http-equiv="refresh"'));
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.outputDirectory,'dist');assert.equal(config.rewrites[0].destination,'/api/index');
});
test('Vercel 함수는 포트를 열지 않고 동일한 서버 API를 처리',async()=>{
 assert.equal(server.listening,false);
 const adapter=http.createServer(handler);await new Promise(r=>adapter.listen(0,'127.0.0.1',r));
 try{const base=`http://127.0.0.1:${adapter.address().port}`;
  const catalog=await fetch(base+'/api/catalog');assert.equal(catalog.status,200);assert.ok(Array.isArray((await catalog.json()).majors));
  const jobs=await fetch(base+'/api/jobs?major=software&demo=1');assert.equal(jobs.status,200);assert.equal((await jobs.json()).mode,'demo');
  assert.equal((await fetch(base+'/.env')).status,404);
 }finally{await new Promise(r=>adapter.close(r));}
});
