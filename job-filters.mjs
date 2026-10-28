import {provinces,regionMetadata,locationOf,validRegion,passesRegion} from './regions.mjs';
export {locationOf} from './regions.mjs';
export const experienceOptions=['신입','경력','경력무관','정보 미제공'];
export const employmentOptions=['인턴','계약직','정규직','공무직','무기계약직','임기제','정보 미제공'];
function clauseWithoutPreference(s){return s.split(/[\n.;。]/).filter(c=>!/우대/.test(c)).join(' ');}
export function careerOf(job){
 const text=`${job.title||''} ${job.content||''}`;
 if(/경력\s*(?:무관|제한\s*없음|관계\s*없음)|경력\s*요건\s*없음/.test(text))return '경력무관';
 const title=job.title||'',requirements=clauseWithoutPreference(job.content||'');
 const entry=/신입/.test(title)||/신입\s*(?:지원|가능|채용|모집|및|·|ㆍ|\/|,|또는|사원)|(?:구분|대상|조건|요건|자격)\s*[:：]?\s*신입/.test(requirements);
 const experienced=/경력(?:직|자|사원|채용|\s*모집)/.test(title)||/경력\s*\d+\s*(?:년|개월)\s*(?:이상|필수)|(?:요건|자격|대상|구분)\s*[:：]?\s*경력|경력직|경력자\s*(?:채용|모집|지원)/.test(requirements)||/신입\s*(?:및|·|ㆍ|\/|,|또는)\s*경력/.test(text);
 return entry&&experienced?'신입·경력':entry?'신입':experienced?'경력':'정보 미제공';
}
export function employmentOf(job){
 const type=job.type||'',title=job.title||'',text=type+' '+title;
 const values=[];
 if(/인턴/.test(text))values.push('인턴');
 if(/계약직|기간제/.test(text.replaceAll('무기계약','')))values.push('계약직');
 if(/공무직/.test(text))values.push('공무직');
 if(/무기계약/.test(text))values.push('무기계약직');
 if(/임기제/.test(text))values.push('임기제');
 if(/정규직/.test(text)&&!/비정규직|정규직\s*전환/.test(text))values.push('정규직');
 return values.length?values:['정보 미제공'];
}
export function annotateJob(job){const official=['work24','alio'].includes(job.source);return {...job,location:locationOf(job.source==='work24'&&job.workAddress?job.workAddress:job.region),experience:official?job.experience:careerOf(job),employment:official&&job.employment?job.employment:employmentOf(job)};}
export function locationCatalog(){return {...regionMetadata,provinces,experienceOptions,employmentOptions};}
export function validateFilters(params){return validRegion(params)&&params.getAll('experience').every(x=>experienceOptions.includes(x))&&params.getAll('employment').every(x=>employmentOptions.includes(x));}
export function passesFilters(job,params){
 if(!passesRegion(job.location,params))return false;
 const careers=params.getAll('experience'),types=params.getAll('employment');
 if(careers.length&&!careers.some(x=>x===job.experience||x==='신입'&&['신입·경력','경력무관'].includes(job.experience)||x==='경력'&&['신입·경력','경력무관'].includes(job.experience)))return false;
 return !types.length||types.some(x=>job.employment.includes(x));
}