import {annotateJob} from './job-filters.mjs';

export function jobStatus(job,today){
 if(job.source==='alio'&&job.ongoing==='N'&&!(job.start&&job.start>today))return '마감';
 if(!job.end)return job.source==='work24'&&job.rolling?'접수 중':'일정 확인';
 if(job.end<today)return '마감';
 return job.start&&job.start>today?'접수 예정':'접수 중';
}

export function sourceHealth(jobs,today){
 const annotated=jobs.map(annotateJob);
 const dated=jobs.map(j=>j.end).filter(Boolean).sort();
 const current=annotated.filter(j=>jobStatus(j,today)==='접수 중');
 const health={unique:jobs.length,missingDeadline:jobs.filter(j=>!j.end).length,missingLocation:annotated.filter(j=>!j.location.city).length,latestDeadline:dated.at(-1)||null,current:current.length,currentBusan:current.filter(j=>j.location.city==='부산광역시').length};
 health.warning=health.currentBusan===0?'현재 API 응답에서 접수 기간과 부산 근무지역이 확인되는 접수 중 공고가 없습니다. 마감일·지역 정보가 누락되거나 과거 공고일 수 있습니다. 공식 최신 공고를 함께 확인해 주세요.':'';
 return health;
}
