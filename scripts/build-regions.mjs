import fs from 'node:fs';
const input=fs.readFileSync(process.argv[2],'utf8');
const rows=input.trim().split(/\r?\n/).slice(1).map(line=>line.split('\t')).filter(([code,,status])=>/^\d{10}$/.test(code)&&status?.trim()==='존재');
const provinces=new Map();
for(const [code,name] of rows){const p=name.split(' ')[0];if(!provinces.has(p))provinces.set(p,{id:code.slice(0,2),name:p,districts:[]});}
const towns=rows.filter(([code,name])=>code.endsWith('00')&&!code.endsWith('00000')&&name.split(' ').length>=2);
for(const [code,fullName] of towns){
 const tokens=fullName.trim().split(/\s+/),p=provinces.get(tokens[0]);
 const name=tokens.slice(1,-1).join(' '),id=code.slice(0,5);
 let district=p.districts.find(d=>d.id===id);
 if(!district){district={id,name:name||'시·군·구 구분 없음',direct:!name,towns:[]};p.districts.push(district);}
 district.towns.push({id:code,name:tokens.at(-1)});
}
const items=[...provinces.values()].filter(p=>p.districts.length).sort((a,b)=>a.id.localeCompare(b.id));
for(const p of items){p.districts.sort((a,b)=>a.name.localeCompare(b.name,'ko'));for(const d of p.districts)d.towns.sort((a,b)=>a.name.localeCompare(b.name,'ko'));}
const count=items.reduce((n,p)=>n+p.districts.reduce((k,d)=>k+d.towns.length,0),0);
if(items.length<15||items.length>20||count<3000)throw new Error('전국 법정동 코드 검증 실패');
const data={source:'https://www.code.go.kr/stdcode/regCodeL.do?menuNo=101010100010',retrievedAt:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),basis:'현존 법정동 · 리 제외 · 행정동으로 자동 변환하지 않음',existingRows:rows.length,townCount:count,provinces:items};
fs.writeFileSync(new URL('../data/regions.json',import.meta.url),JSON.stringify(data));
console.log(JSON.stringify({provinces:items.length,districts:items.reduce((n,p)=>n+p.districts.length,0),towns:count}));
