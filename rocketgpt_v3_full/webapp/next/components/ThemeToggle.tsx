'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle(){
  const KEY='rgpt-theme';
  const [mode,setMode] = useState('auto');
  useEffect(()=>{
    try{
      const saved = localStorage.getItem(KEY);
      if(saved==='dark'){ document.documentElement.classList.add('dark'); setMode('dark'); }
      else if(saved==='light'){ document.documentElement.classList.remove('dark'); setMode('light'); }
    }catch(e){}
  },[]);
  function toggle(){
    try{
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem(KEY, isDark? 'dark' : 'light');
      setMode(isDark? 'dark' : 'light');
    }catch(e){}
  }
  return <button onClick={toggle} aria-label="Toggle theme" className="rounded-lg border border-white/10 px-3 py-1">Theme</button>;
}
