'use client'

import { useEffect, useState } from 'react'

export default function StatusBadge(){
  const [ok,setOk] = useState(null as null | boolean);
  useEffect(()=>{
    let timer:any;
    const load = async()=>{
      try{
        const res = await fetch('/api/health',{cache:'no-store'});
        if(!res.ok) throw new Error('bad');
        const j = await res.json();
        setOk(j && j.overall === 'ok');
      }catch(e){ setOk(false); }
      timer = setTimeout(load, 30000);
    };
    load();
    return ()=> { if(timer) clearTimeout(timer); };
  },[])
  const color = ok===null? 'bg-gray-400 animate-pulse' : (ok? 'bg-green-500' : 'bg-red-500');
  const title = ok===null? 'checking...' : (ok? 'all systems operational' : 'degraded');
  return (<span title={title} className={'inline-block w-2 h-2 rounded-full ' + color} />);
}
