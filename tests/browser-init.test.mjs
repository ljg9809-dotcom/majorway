import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
class Element {
 constructor(tag='div',text=''){this.tag=tag;this.textContent=text;this.value='';this.hidden=false;this.checked=false;this.children=[];}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(){}
 setAttribute(){}
 scrollIntoView(){}
}
for(const legacy of [false,true])test(`화면 초기화 및 실제 학과 선택: ${legacy?'이전 HTML 구조':'최신 HTML 구조'}`,async()=>{
 const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 if(legacy)for(const id of ['sub-major-field','explore-path','explore-description'])elements.delete(id);
 const label=new Element('label'),calls=[];
 const major={id:'software',name:'컴퓨터',group:'공학',subs:['소프트웨어'],roles:[{name:'전산',desc:'시스템 운영',words:['전산']}]};
 const document={getElementById:id=>elements.get(id)||null,createElement:tag=>new Element(tag),querySelectorAll:()=>[],querySelector:()=>label};
 const sandbox={document,Option:function(text,value){this.text=text;this.value=value;},URLSearchParams,AbortController,setTimeout,clearTimeout,testMajor:major,fetch:async url=>{calls.push(String(url));return {ok:true,json:async()=>String(url).startsWith('/api/catalog')?{majors:[major],configured:true,universityConfigured:true,filters:{areas:[]}}:{jobs:[],mode:'live',total:0,scanned:0,updatedAt:new Date().toISOString(),facets:{areas:[]}}};}};
 vm.createContext(sandbox);vm.runInContext(app,sandbox);
 for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 const status=()=>elements.get('result-message').children.map(e=>e.textContent).join(' ');
 assert.ok(!/설정을 불러오지|초기화하지 못/.test(status()));
 assert.ok(calls.some(url=>url.startsWith('/api/jobs?')));
 vm.runInContext("selectedDepartment='official-department';setProfile(testMajor);",sandbox);
 for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(!/설정을 불러오지|초기화하지 못/.test(status()));
 if(legacy){assert.equal(elements.get('sub-major').hidden,true);assert.equal(label.hidden,true);}
 else assert.equal(elements.get('sub-major-field').hidden,true);
 assert.ok(calls.at(-1).includes('department=official-department'));
});
