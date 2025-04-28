async function toBase64(file:File):Promise<string>{
  return await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=()=>rej(r.error); r.readAsDataURL(file);} );
}
const fileInput=document.getElementById('fileInput') as HTMLInputElement;
const startBtn=document.getElementById('startBtn') as HTMLButtonElement;
const progressEl=document.getElementById('progress') as HTMLDivElement;
const statusEl=document.getElementById('status') as HTMLSpanElement;
const barFill=document.getElementById('fill') as HTMLDivElement;
const subtitlePreview=document.getElementById('subtitlePreview') as HTMLPreElement;
const downloadArea=document.getElementById('downloadArea') as HTMLDivElement;
const downloadBtn=document.getElementById('downloadBtn') as HTMLButtonElement;

startBtn.onclick=async()=>{
  const file=fileInput.files![0]; if(!file)return alert('Chọn file!');
  startBtn.disabled=true;
  const data=await toBase64(file);
  // Note: The backend expects the file data in the 'file' field of the JSON body.
  // The base64 data URL includes the MIME type prefix (e.g., "data:audio/wav;base64,...").
  // The backend worker.ts currently uses this directly for the Gemini API call.
  // Depending on the actual Gemini API requirements for media input, you might need
  // to extract just the base64 string part on the backend.
  const resp=await fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:data})});
  const {jobId}=await resp.json();
  progressEl.classList.remove('hidden');
  // Establish Server-Sent Events connection to stream progress and result
  const es=new EventSource(`/stream/${jobId}`);
  es.addEventListener('progress',e=>{
    const d=JSON.parse((e as MessageEvent).data);
    statusEl.textContent=d.percent+'%';
    barFill.style.width=d.percent+'%';
  });
  es.addEventListener('done',e=>{
    const d=JSON.parse((e as MessageEvent).data);
    subtitlePreview.textContent=d.srt;
    subtitlePreview.classList.remove('hidden');
    downloadArea.classList.remove('hidden');
    es.close(); // Close the SSE connection once done
  });
  // Add error handling for EventSource
  es.onerror = (err) => {
    console.error("EventSource failed:", err);
    statusEl.textContent = 'Lỗi!';
    startBtn.disabled = false; // Re-enable button on error
    es.close();
  };
};
downloadBtn.onclick=()=>{
  const blob=new Blob([subtitlePreview.textContent!],{type:'text/plain'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='subtitles.srt'; a.click();
};
