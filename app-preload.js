(function(){
  const nativeFetch=window.fetch.bind(window);

  function decorateCase(c){
    if(!c||typeof c!=='object')return c;
    if(c.run_id){
      const round=Number(c.training_round||0)||'?';
      const raw=String(c.title||'Caso de treinamento');
      if(!raw.startsWith('[begin_test')) c.title=`[begin_test R${round}] ${raw}`;
    }
    return c;
  }

  function newestRunId(list){
    const training=list.filter(c=>c&&c.run_id);
    training.sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0));
    return training[0]?.run_id||null;
  }

  function sortCases(list){
    const activeRun=newestRunId(list);
    const decorated=list.map(c=>decorateCase({...c}));
    decorated.sort((a,b)=>{
      const aCurrent=activeRun&&a.run_id===activeRun?1:0;
      const bCurrent=activeRun&&b.run_id===activeRun?1:0;
      if(aCurrent!==bCurrent)return bCurrent-aCurrent;
      const aAnalyzed=Array.isArray(a.analyses)&&a.analyses.length?1:0;
      const bAnalyzed=Array.isArray(b.analyses)&&b.analyses.length?1:0;
      if(aAnalyzed!==bAnalyzed)return bAnalyzed-aAnalyzed;
      return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);
    });
    return {cases:decorated,activeRun};
  }

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(!url.startsWith('/api/cases'))return response;
      const data=await response.clone().json();
      if(Array.isArray(data.cases)){
        const sorted=sortCases(data.cases);
        data.cases=sorted.cases;
        data.active_training_run_id=sorted.activeRun;
        data.ui_scope=sorted.activeRun?'active_begin_test_first':'all_cases';
      }else if(data.case){
        data.case=decorateCase({...data.case});
      }
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
    }catch(_error){
      return response;
    }
  };
})();
