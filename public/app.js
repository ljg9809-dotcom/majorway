const $=id=>document.getElementById(id);
let catalog=[],selected=null,selectedRole='',selectedDepartment='',currentJobs=[],requestId=0,controller,departmentRequest=0,departmentController,profileRequest=0;
let filterData={provinces:[]};
let universityConfigured=false,universityRequest=0;
const source='https://job.alio.go.kr/recruit.do';
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function message(text,error=false){$('result-message').replaceChildren(...(text?[el('div',text,'message'+(error?' error':''))]:[]));}
function updateLocationControls(){
 const province=$('location-province').value,district=$('location-district').value,town=$('location-town').value;
 const provinces=filterData.provinces||[];
 $('location-province').replaceChildren(new Option('전국 전체',''),...provinces.map(p=>new Option(p.name,p.id)));$('location-province').value=provinces.some(p=>p.id===province)?province:'';
 const active=provinces.find(p=>p.id===$('location-province').value),districts=active?.districts||[];
 $('location-district').replaceChildren(new Option(active?'시·군·구 전체':'시·도를 먼저 선택하세요',''),...districts.map(d=>new Option(d.name,d.id)));
 $('location-district').value=districts.some(d=>d.id===district)?district:districts.length===1&&districts[0].direct?districts[0].id:'';
 $('location-district').disabled=!active;
 const selected=districts.find(d=>d.id===$('location-district').value),towns=selected?.towns||[];
 $('location-town').replaceChildren(new Option(selected?'읍·면·동 전체':'시·군·구를 먼저 선택하세요',''),...towns.map(t=>new Option(t.name,t.id)));$('location-town').value=towns.some(t=>t.id===town)?town:'';$('location-town').disabled=!selected;
}
function resetGeo(){for(const id of ['location-province','location-district','location-town'])$(id).value='';updateLocationControls();}
function renderMajors(){
 const term=$('major-search').value.trim();const visible=catalog.filter(m=>[m.name,m.group,...m.subs].some(x=>x.includes(term)));
 $('major-list').replaceChildren(...visible.map(m=>{const b=el('button',undefined,'major-btn'+(selected?.id===m.id?' active':''));b.type='button';b.setAttribute('aria-pressed',String(selected?.id===m.id));b.append(el('strong',m.name),el('span',m.group));b.onclick=()=>selectMajor(m);return b;}));
 if(!visible.length)$('major-list').append(el('p','등록된 전공이 없어요. 가까운 분야로 검색해 보세요.','small-muted'));
}
function renderRoles(){
 const all=el('button',undefined,'role-card'+(!selectedRole?' active':''));all.type='button';all.setAttribute('aria-pressed',String(!selectedRole));all.append(el('span','↗','role-icon'),el('strong','관련 직무 전체'),el('p','전공과 연결되는 다양한 가능성을 함께 살펴봐요.'));all.onclick=()=>{selectedRole='';renderRoles();loadJobs();};
 $('roles').replaceChildren(all,...selected.roles.map(r=>{const b=el('button',undefined,'role-card'+(selectedRole===r.name?' active':''));b.type='button';b.setAttribute('aria-pressed',String(selectedRole===r.name));b.append(el('span','✳','role-icon'),el('strong',r.name),el('p',r.desc));b.onclick=()=>{selectedRole=r.name;renderRoles();loadJobs();};return b;}));
}
function selectMajor(m){profileRequest++;selectedDepartment='';$('department-selected').hidden=true;setProfile(m);}
function setProfile(m){
 universityRequest++;$('university-panel').hidden=true;selected=m;selectedRole='';
 $('selected-major').textContent=m.name;
 $('sub-major').replaceChildren(new Option('세부 전공 전체',''),...m.subs.map(s=>new Option(s,s)));
 const subField=$('sub-major-field');
 if(subField)subField.hidden=!!selectedDepartment;
 else{$('sub-major').hidden=!!selectedDepartment;const label=document.querySelector('label[for="sub-major"]');if(label)label.hidden=!!selectedDepartment;}
 const pathLabel=$('explore-path');if(pathLabel)pathLabel.textContent=selectedDepartment?'선택한 학과 → 관련 직무 → 채용정보':'관심 분야 → 세부 전공 → 관련 직무';
 const description=$('explore-description');if(description)description.textContent=selectedDepartment?'학과가 선택됐어요. 원하는 지역과 채용 조건을 고르면 관련 공고를 확인할 수 있어요.':'조금 더 구체적으로, 나에게 가까운 분야를 찾아보세요.';
 renderMajors();renderRoles();loadJobs();
}
function prepareUniversity(profile){
 const unique=new Map();for(const o of profile.department.offerings)if(($('department-closed').checked||o.status!=='폐과')&&!unique.has(o.schoolId))unique.set(o.schoolId,o.school);
 $('university-school').replaceChildren(...[...unique].sort((a,b)=>a[1].localeCompare(b[1],'ko')).map(([id,name])=>new Option(name,id)));
 const schoolQuery=$('department-school').value.replace(/\s+/g,'');const matchingSchool=schoolQuery?[...unique].filter(([,name])=>name.replace(/\s+/g,'').includes(schoolQuery)):[];if(matchingSchool.length===1)$('university-school').value=matchingSchool[0][0];
 $('university-year').value='2026';$('university-panel').hidden=false;$('university-info').replaceChildren();$('university-load').disabled=!universityConfigured;
 $('university-status').textContent=universityConfigured?'개설 대학을 고르고 불러오기를 누르세요. 2026년 제공 자료가 0건이면 2025년 조회 사실을 표시합니다.':'대학 API 키 등록 후 서버를 다시 시작하면 공식 정보를 조회할 수 있어요.';
}
async function loadUniversity(){
 if(!selectedDepartment)return;const id=++universityRequest;$('university-load').disabled=true;$('university-info').replaceChildren();$('university-status').textContent='선택한 대학의 공식 학과정보를 조회하고 있어요…';
 try{
  const response=await fetch('/api/university-info?'+new URLSearchParams({department:selectedDepartment,school:$('university-school').value,year:$('university-year').value}));const data=await response.json();if(id!==universityRequest)return;if(!response.ok)throw new Error(data.error||'공식 정보 조회를 완료하지 못했습니다.');
  $('university-status').textContent=`${data.note} 제공 연도: ${data.providedYear}년 · 대학 전체 ${data.totalForSchool}건 중 ${data.scanned}건 확인${data.partial?' · 일부 범위 조회':''}`;
  if(!data.records.length){$('university-info').append(el('p','해당 연도에 학과명과 대학명이 일치하는 학사·전문학사 상세정보가 없습니다. 대학이나 조회 연도를 변경해 보세요.','filter-help'));return;}
  for(const r of data.records){const card=el('article',undefined,'university-card');card.append(el('h4',`${r.school} · ${r.name}`));const grid=el('div',undefined,'detail-grid');for(const [label,value] of [['제공 연도',r.year],['단과대학',r.college],['학위',r.degree],['수업연한',r.duration],['주야과정',r.shift],['학과 상태',r.status],['입학정원',r.admissionQuota],['자료 기준일',r.dataDate]])grid.append(el('div',`${label} · ${value||'미제공'}`));card.append(grid,el('h4','교육과정'),el('p',r.curriculum||'제공처의 응답에 교육과정 정보가 없습니다.','detail-content'),el('h4','관련 직업'),el('p',r.occupations||'제공처의 응답에 관련 직업 정보가 없습니다.','detail-content'));$('university-info').append(card);}
 }catch(error){if(id===universityRequest)$('university-status').textContent=error.message;}
 finally{if(id===universityRequest)$('university-load').disabled=false;}
}
async function findDepartments(){
 const id=++departmentRequest;departmentController?.abort();departmentController=new AbortController();
 const q=$('department-query').value.trim(),school=$('department-school').value.trim();
 $('department-results').replaceChildren();
 if(!q&&!school){$('department-hint').textContent='대학·전문대학의 실제 학과명을 입력하세요. 띄어쓰기가 달라도 찾을 수 있어요.';return;}
 $('department-hint').textContent='공식 학과 목록에서 찾고 있어요…';
 try{
  const response=await fetch('/api/departments?'+new URLSearchParams({q,school,closed:$('department-closed').checked?'1':'0'}),{signal:departmentController.signal});
  if(!response.ok)throw new Error();const data=await response.json();if(id!==departmentRequest)return;
  $('department-hint').textContent=data.total?`${data.total.toLocaleString()}개 학과 분류 검색 · ${data.items.length}개 표시${data.total>data.items.length?' · 학과명이나 대학명으로 더 좁혀보세요.':''}`:'일치하는 학과가 없어요. 짧은 이름으로 검색하거나 폐과 포함을 선택해 보세요.';
  $('department-results').replaceChildren(...data.items.map(d=>{const b=el('button',undefined,'department-option');b.type='button';b.append(el('strong',d.name),el('span',`${d.small} · ${d.schools.join(', ')}${d.schoolCount>d.schools.length?` 외 ${d.schoolCount-d.schools.length}개교`:''}`),el('small',d.closedOnly?'폐과 기록':'학과 선택 ↗'));b.onclick=()=>chooseDepartment(d.id);return b;}));
 }catch(error){if(error.name!=='AbortError'&&id===departmentRequest)$('department-hint').textContent='학과 목록을 불러오지 못했습니다. 입력을 바꾸어 다시 시도해 주세요.';}
}
async function chooseDepartment(departmentId){
 const id=++profileRequest;
 try{const response=await fetch('/api/department?'+new URLSearchParams({id:departmentId}));if(!response.ok)throw new Error();const profile=await response.json();if(id!==profileRequest)return;
  selectedDepartment=departmentId;setProfile(profile);prepareUniversity(profile);
  const d=profile.department,box=$('department-selected');box.hidden=false;
  const active=d.offerings.filter(o=>o.status!=='폐과'),schools=[...new Set(active.map(o=>o.school))];
  box.replaceChildren(el('span','선택한 실제 학과 · '+d.year,'section-kicker'),el('h3',d.name),el('p',`${d.large} → ${d.middle} → ${d.small}`),el('p',schools.length?`폐과를 제외한 개설 학교 ${schools.length}개 · ${schools.slice(0,8).join(', ')}${schools.length>8?' 외':''}`:'현재 공개 목록에는 폐과 기록만 있습니다.'));
  const disclosure=el('details'),summary=el('summary','학교·캠퍼스·학과 상태 확인');disclosure.append(summary);
  const list=el('ul');for(const o of d.offerings)list.append(el('li',`${o.school} · ${o.campus} · ${o.shift} · ${o.status||'상태 미제공'}`));disclosure.append(list);box.append(disclosure,el('p',profile.roles.length?'관련 직무는 학과명·공식 계열을 바탕으로 한 서비스의 키워드 추정입니다. 공식 취업 추천이나 지원 자격 판정이 아닙니다.':'학과 정보는 등록되어 있으나 관련 직무 연결은 검토 중입니다. 관심 분야에서 가까운 직무를 탐색해 주세요.','small-muted'));
  $('department-selected').scrollIntoView({behavior:'instant',block:'start'});
 }catch{if(id===profileRequest)$('department-hint').textContent='학과를 선택하지 못했어요. 다시 선택해 주세요.';}
}
function showDetail(job){
 const box=$('detail-body');box.replaceChildren(el('span',$('demo').checked?'DEMO · 가상 공고':'JOB-ALIO · KOREA CAREER','section-kicker'),el('h2',job.title),el('p',job.agency));
 const grid=el('div',undefined,'detail-grid');for(const [label,value] of [['채용분야',job.field],['근무형태',job.type],['경력 조건',job.experience],['분류된 고용 형태',job.employment?.join(' · ')],['근무지역',job.workAddress||job.region],['급여',job.salary],['등록일',job.registered],['지역 정보',job.location?.detail],['접수방법',job.method],['접수시작',job.start],['접수마감',job.end]])grid.append(el('div',`${label}  ·  ${value||'기관 안내 확인'}`));box.append(grid,el('h3','공고 상세'),el('p',job.content||'제공된 상세 내용이 없습니다. 기관 공고를 확인해 주세요.','detail-content'),el('h3','내 전공과 연결된 이유'),el('p',`공고의 제목·채용분야·지원 자격에서 ${job.match.words.join(', ')} 키워드가 발견됐어요. 지원 자격과 필수 전공은 공고 원문에서 별도로 확인하세요.`));
 if(!$('demo').checked){const a=el('a',job.sourceUrl?'잡알리오 공고 원문 보기 ↗':'잡알리오에서 공고명 검색 ↗','detail-source');a.href=job.sourceUrl||source;a.target='_blank';a.rel='noopener noreferrer';box.append(a,el('p','출처: 잡알리오 공공기관 채용정보 · 상세 지원 자격과 접수 상태는 원문을 확인하세요.','small-muted'));}
 $('detail').showModal();
}
function renderJobs(jobs){
 $('jobs').replaceChildren(...jobs.map(j=>{
  const card=el('article',undefined,'job'),top=el('div',undefined,'job-top');top.append(el('span',j.agency||'기관명 미제공','agency'),el('span',j.status,'badge'+(j.status==='마감'?' closed':'')));
  const bottom=el('div',undefined,'job-bottom'),tags=el('div',undefined,'match-tags');tags.append(...j.match.words.slice(0,4).map(w=>el('span',`# ${w}`)));const b=el('button','상세 보기 ↗','detail-button');b.setAttribute('aria-label',`${j.title} 상세 보기`);b.onclick=()=>showDetail(j);bottom.append(tags,b);
  card.append(top,el('h3',j.title||'제목 미제공'),el('div',`${j.region||'지역 미제공'}  ·  ${j.type||'근무형태 확인'}  ·  ${j.end?j.end+' 마감':j.deadlineLabel||'일정 확인 필요'}`,'job-meta'),el('div',`경력: ${j.experience} · 고용: ${j.employment.join(' · ')} · ${j.location.detail}`,'job-meta'),bottom);return card;
 }));
}
function showJobFeedback(data,demo){
 const empty=!data.jobs.length,health=data.health;
 let text=empty?'조건에 맞는 공고가 없습니다. 직무·지역·경력 조건을 넓혀 보세요.':'';
 if(!demo&&health?.warning)text=health.warning;
 else if(empty&&$('open-only').checked&&data.matchedBeforeOpen>0)text='관련 공고는 있지만 접수 중으로 확인된 공고가 없습니다.';
 message(text);
 if(empty&&$('open-only').checked&&data.matchedBeforeOpen>0){
  const button=el('button',`마감·일정 미확인 공고 ${data.matchedBeforeOpen}건 보기`,'detail-button');button.type='button';
  button.onclick=()=>{$('open-only').checked=false;loadJobs();};$('result-message').append(button);
 }
 if(!demo&&(empty||health?.warning)){
  const link=el('a','잡알리오에서 채용정보 확인 ↗','detail-source');link.href=source;link.target='_blank';link.rel='noopener noreferrer';$('result-message').append(link);
 }
 if(demo){$('coverage').textContent='화면 체험용 가상 데이터입니다. 실제 지원에 사용할 수 없습니다.';return;}
 if(data.source==='alio'){
  $('coverage').textContent=`출처: 잡알리오 · ${data.regionScope||'전국'} 조회 공고 ${data.total}건 중 응답 ${data.scanned}건 / 중복 제거 ${data.unique}건 확인 · ${new Date(data.updatedAt).toLocaleString('ko-KR')} 서버 조회${data.partial?' · 일부 범위 조회이며 전체 검색 결과가 아닙니다.':''} · 구·동 정보가 없는 공고는 상세 지역을 추정하지 않습니다.`;return;
 }
 const latest=health?.latestDeadline?` · 제공된 마감일 중 가장 최근: ${health.latestDeadline}`:'';
 $('coverage').textContent=`API 전체 ${data.total.toLocaleString()}건 중 응답 ${data.scanned.toLocaleString()}건 확인 · 중복 제거 ${data.unique??data.scanned}건${health?` · 마감일 미제공 ${health.missingDeadline}건 · 국내 근무지역 미확인 ${health.missingLocation}건`:''}${latest} · ${new Date(data.updatedAt).toLocaleString('ko-KR')} 서버 조회${data.partial?' · 일부 범위 조회':''}${data.repeatedPage?' · 제공처가 같은 페이지를 반복 반환해 추가 조회를 중단했습니다.':''}`;
}
async function loadJobs(){
 if(!selected)return;const id=++requestId;controller?.abort();controller=new AbortController();$('refresh').disabled=true;currentJobs=[];$('count').textContent='…';$('jobs').replaceChildren();$('coverage').textContent='';message('전공과 연결된 공고를 찾고 있어요…');
 const demo=$('demo').checked;$('mode-label').textContent=demo?'● 예시 데이터 · 실제 채용공고가 아닙니다':'● 잡알리오 · 공공기관 채용';
 if(!selected.roles.length){$('count').textContent='0';message('이 학과의 직무 연결은 검토 중입니다. 가까운 관심 분야를 선택해 탐색해 보세요.');$('refresh').disabled=false;return;}
 const params=new URLSearchParams({major:selected.id,department:selectedDepartment,sub:selectedDepartment?'':$('sub-major').value,role:selectedRole,q:$('keyword').value,open:$('open-only').checked?'1':'0',demo:demo?'1':'0',province:$('location-province').value,district:$('location-district').value,town:$('location-town').value,includeUnknownLocation:$('unknown-location').checked?'1':'0'});
 for(const name of ['experience','employment'])document.querySelectorAll(`input[name="${name}"]:checked`).forEach(input=>params.append(name,input.value));
 try{const response=await fetch('/api/jobs?'+params,{signal:controller.signal});const data=await response.json();if(id!==requestId)return;if(!response.ok)throw new Error(data.error||'조회하지 못했습니다.');currentJobs=data.jobs;if(data.facets){filterData=data.facets;updateLocationControls();}$('count').textContent=String(currentJobs.length);renderJobs(currentJobs);showJobFeedback(data,demo);}
 catch(error){if(error.name!=='AbortError'&&id===requestId){$('count').textContent='0';message(error.message,true);}}
 finally{if(id===requestId)$('refresh').disabled=false;}
}
$('major-search').addEventListener('input',renderMajors);
$('university-load').addEventListener('click',loadUniversity);
for(const name of ['university-school','university-year'])$(name).addEventListener('change',()=>{universityRequest++;$('university-load').disabled=!universityConfigured;$('university-info').replaceChildren();$('university-status').textContent='변경한 조건으로 공식 정보를 다시 불러오세요.';});
$('location-province').addEventListener('change',()=>{$('location-district').value='';$('location-town').value='';updateLocationControls();loadJobs();});
$('location-district').addEventListener('change',()=>{$('location-town').value='';updateLocationControls();loadJobs();});
$('demo').addEventListener('change',()=>{resetGeo();loadJobs();});
document.querySelectorAll('input[name="experience"], input[name="employment"]').forEach(input=>input.addEventListener('change',loadJobs));
$('reset-filters').onclick=()=>{resetGeo();$('unknown-location').checked=false;$('keyword').value='';$('open-only').checked=true;document.querySelectorAll('input[name="experience"], input[name="employment"]').forEach(input=>input.checked=false);loadJobs();};
let departmentTimer;for(const id of ['department-query','department-school'])$(id).addEventListener('input',()=>{clearTimeout(departmentTimer);departmentTimer=setTimeout(findDepartments,200);});
$('department-closed').addEventListener('change',findDepartments);
findDepartments();
for(const id of ['sub-major','open-only','location-town','unknown-location'])$(id).addEventListener('change',loadJobs);
let debounce;$('keyword').addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(loadJobs,300);});
$('job-search')?.addEventListener('submit',event=>{event.preventDefault();clearTimeout(debounce);loadJobs();});
$('refresh').onclick=loadJobs;$('about').onclick=()=>$('about-dialog').showModal();document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
async function init(){
 let data;
 try{const response=await fetch('/api/catalog',{cache:'no-store'});if(!response.ok)throw new Error();data=await response.json();if(!Array.isArray(data.majors)||!data.majors.length)throw new Error();}
 catch{message('설정을 불러오지 못했어요. 서버 실행 상태를 확인하고 페이지를 새로고침해 주세요.',true);return;}
 try{catalog=data.majors;universityConfigured=!!data.universityConfigured;filterData=data.filters||{provinces:[]};updateLocationControls();$('demo').checked=!data.configured;$('setup-note').hidden=data.configured;selectMajor(catalog[0]);}
 catch{message('화면을 초기화하지 못했어요. 페이지를 새로고침해 최신 화면을 불러와 주세요.',true);}
}
init();
