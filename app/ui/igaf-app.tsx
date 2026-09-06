/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Camera, Check, ChevronRight, CircleAlert, Clock3, Download, ExternalLink, GraduationCap, Home, Library, LoaderCircle, Search, ShieldCheck, X } from "lucide-react";
import studentsData from "../data/students.json";
import { baseCourse, courseAliases, examFor, matchesStudentName, normalize, type ExamStatus, type Student } from "../lib/igaf";
import { fetchLibraryResources, isPdfResource, publicResourceUrl, RESOURCE_CATEGORIES, resourceTypeLabel, type LibraryResource } from "../lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import SiteFooter from "./site-footer";
import SafeImg from "./safe-img";

type View = "home" | "exams" | "library" | "coupon";
type StudentExam = { key:string; course:string; semester:3|4; credits:number; date:string|null; dateLabel:string; official:string; mode:string };
const students = studentsData as Student[];
const todayISO = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Kinshasa",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const creditsOf = (s:string) => Number(s.match(/\((\d+)\s*cr\.\)/i)?.[1] ?? 0);

function buildExams(student:Student):StudentExam[] {
  return [...student.semester3.map(course=>({course,semester:3 as const})),...student.semester4.map(course=>({course,semester:4 as const}))].map((item,i)=>{
    const e=examFor(item.course); return { key:`${item.semester}-${normalize(baseCourse(item.course))}-${i}`, course:baseCourse(item.course), semester:item.semester, credits:creditsOf(item.course), date:e?.date??null, dateLabel:e?.label??"Date à confirmer", official:e?.official??baseCourse(item.course), mode:normalize(baseCourse(item.course)).includes("projet tutore")?"Dépôt":"Écrit" };
  }).sort((a,b)=>(a.date??"9999").localeCompare(b.date??"9999"));
}

export default function IgafApp(){
  const [query,setQuery]=useState(""); const [student,setStudent]=useState<Student|null>(null); const [view,setView]=useState<View>("home");
  const [statuses,setStatuses]=useState<Record<string,ExamStatus>>({}); const [confirm,setConfirm]=useState<StudentExam|null>(null);
  const [filter,setFilter]=useState("all"); const [resources,setResources]=useState<LibraryResource[]>([]);
  const [libraryLoading,setLibraryLoading]=useState(true); const [libraryError,setLibraryError]=useState<string|null>(null);
  const matches=useMemo(()=>{if(query.trim().length<2)return [];return students.filter(s=>matchesStudentName(s.name,query)).slice(0,8)},[query]);
  const exams=useMemo(()=>student?buildExams(student):[],[student]);
  const loadResources=async()=>{setLibraryLoading(true);const result=await fetchLibraryResources();setResources(result.data);setLibraryError(result.error);setLibraryLoading(false)};
  useEffect(()=>{if(student){const raw=localStorage.getItem(`igaf-progress:${student.id}`);setStatuses(raw?JSON.parse(raw):{})}},[student]);
  useEffect(()=>{void loadResources()},[]);
  useEffect(()=>{if(view==="library")void loadResources()},[view]);
  const saveStatus=(exam:StudentExam,status:ExamStatus)=>{if(!student)return;const next={...statuses,[exam.key]:status};setStatuses(next);localStorage.setItem(`igaf-progress:${student.id}`,JSON.stringify(next));setConfirm(null);toast.success(status==="done"?"Examen marqué comme effectué":"Statut mis à jour")};
  const selectStudent=(s:Student)=>{setStudent(s);setQuery("");setView("home");localStorage.setItem("igaf-last-student",String(s.id))};
  useEffect(()=>{const id=Number(localStorage.getItem("igaf-last-student"));const s=students.find(x=>x.id===id);if(s)setStudent(s)},[]);
  const done=exams.filter(e=>statuses[e.key]==="done").length;const missed=exams.filter(e=>statuses[e.key]==="missed").length;
  const todays=exams.filter(e=>e.date===todayISO());const nextExam=exams.find(e=>e.date&&e.date>=todayISO()&&statuses[e.key]!=="done");
  const shown=exams.filter(e=>filter==="all"||filter===`s${e.semester}`||filter==="today"&&e.date===todayISO()||filter==="done"&&statuses[e.key]==="done"||filter==="todo"&&(!statuses[e.key]||statuses[e.key]==="todo")||filter==="missed"&&statuses[e.key]==="missed");

  return <div className={`mesh flex min-h-screen flex-col ${student?"pb-24 md:pb-0":""}`}><Toaster richColors position="top-center" />
    <header className="no-print sticky top-0 z-40 border-b bg-white/92 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <button onClick={()=>setView("home")} className="flex items-center gap-2.5"><SafeImg src="/logo-l2.jpeg" alt="Logo L2 LMD IGAF" width={44} height={44} className="h-11 w-11 rounded-full border-2 border-[#e5c443] bg-white object-cover"/><div className="text-left"><b className="block text-lg leading-5 text-[#0879b7]">IGAF L2</b><span className="text-xs text-slate-500">Rachat 2025–2026</span></div></button>
      {student?<button onClick={()=>{setStudent(null);localStorage.removeItem("igaf-last-student")}} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold">Changer de nom</button>:<a href="/admin" className="text-sm text-slate-500">Administration</a>}
    </div></header>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
      {!student?<Welcome query={query} setQuery={setQuery} matches={matches} selectStudent={selectStudent}/>:<>
        <section className="mb-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0879b7] to-[#07547f] p-5 text-white shadow-xl shadow-sky-900/15 md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-sky-100">Bonjour 👋</p><h1 className="mt-1 text-2xl font-extrabold md:text-4xl">{student.name}</h1><p className="mt-2 text-sm text-sky-100">Votre parcours personnel des examens de rachat.</p></div><GraduationCap className="h-10 w-10 text-[#f4d65a]"/></div>
          <div className="mt-6 grid grid-cols-3 gap-2"><Metric value={exams.length} label="À passer"/><Metric value={done} label="Effectués"/><Metric value={student.credits} label="Crédits"/></div>
          <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>Progression</span><b>{exams.length?Math.round(done/exams.length*100):100}%</b></div><Progress value={exams.length?done/exams.length*100:100} className="h-2.5 bg-white/20"/></div>
        </section>
        {view==="home"&&<Dashboard todays={todays} nextExam={nextExam} statuses={statuses} setConfirm={setConfirm} setView={setView} done={done} missed={missed} total={exams.length}/>} 
        {view==="exams"&&<Exams exams={shown} statuses={statuses} setConfirm={setConfirm} filter={filter} setFilter={setFilter}/>} 
        {view==="library"&&<CourseLibrary exams={exams} resources={resources} loading={libraryLoading} error={libraryError} onRetry={loadResources}/>} 
        {view==="coupon"&&<CouponCheck exams={exams}/>} 
      </>}
    </main>
    {student&&<nav className="no-print fixed inset-x-0 bottom-0 z-50 border-t bg-white safe-bottom md:static md:mx-auto md:mt-2 md:mb-2 md:max-w-2xl md:rounded-2xl md:border md:p-1"><div className="grid grid-cols-4"><NavButton active={view==="home"} onClick={()=>setView("home")} icon={Home} label="Accueil"/><NavButton active={view==="exams"} onClick={()=>setView("exams")} icon={CalendarDays} label="Examens"/><NavButton active={view==="library"} onClick={()=>setView("library")} icon={Library} label="PDF"/><NavButton active={view==="coupon"} onClick={()=>setView("coupon")} icon={Camera} label="Coupon"/></div></nav>}
    <SiteFooter />
    <Dialog open={!!confirm} onOpenChange={o=>!o&&setConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Confirmer le statut</DialogTitle><DialogDescription>{confirm?.course}</DialogDescription></DialogHeader><div className="grid gap-2 sm:grid-cols-2"><button onClick={()=>confirm&&saveStatus(confirm,"done")} className="rounded-xl bg-emerald-600 p-3 font-bold text-white">✓ Examen effectué</button><button onClick={()=>confirm&&saveStatus(confirm,"missed")} className="rounded-xl bg-rose-100 p-3 font-bold text-rose-700">Examen manqué</button></div></DialogContent></Dialog>
  </div>
}

function Welcome({query,setQuery,matches,selectStudent}:{query:string;setQuery:(s:string)=>void;matches:Student[];selectStudent:(s:Student)=>void}){return <div className="mx-auto max-w-2xl pt-4 md:pt-12"><div className="mb-6 text-center"><SafeImg src="/logo-l2.jpeg" alt="Logo promotion IGAF L2 LMD" width={126} height={126} className="mx-auto h-[126px] w-[126px] rounded-full border-4 border-white bg-white object-cover shadow-xl"/><p className="mt-6 text-sm font-bold uppercase tracking-[.2em] text-[#b48b08]">Un pour tous</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Tes examens, sans confusion.</h1><p className="mx-auto mt-3 max-w-lg text-base leading-7 text-slate-600">Saisis ton nom pour voir les examens que tu dois passer au semestre 3 et au semestre 4.</p></div>
  <div className="relative rounded-3xl border bg-white p-3 shadow-2xl shadow-sky-900/10"><div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4"><Search className="h-5 w-5 text-[#0879b7]"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ibrahim Kasende" className="h-14 w-full bg-transparent text-base font-semibold outline-none"/></div>{query.length>=2&&<div className="mt-2 overflow-hidden rounded-2xl border bg-white">{matches.length?matches.map(s=><button key={s.id} onClick={()=>selectStudent(s)} className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-0 hover:bg-sky-50"><span><b className="block text-sm">{s.name}</b><small className="text-slate-500">{s.credits} crédits à racheter</small></span><ChevronRight className="h-4 w-4"/></button>):<p className="p-5 text-center text-sm text-slate-500">Aucun nom trouvé. Vérifie l’orthographe.</p>}</div>}</div>
  <div className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-slate-500"><ShieldCheck className="h-4 w-4"/>Aucun compte ni mot de passe nécessaire.</div></div>}

function Metric({value,label}:{value:number;label:string}){return <div className="rounded-2xl bg-white/12 p-3 text-center backdrop-blur"><b className="block text-xl md:text-2xl">{value}</b><span className="text-xs text-sky-100">{label}</span></div>}
function NavButton({active,onClick,icon:Icon,label}:any){return <button onClick={onClick} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold ${active?"bg-sky-50 text-[#0879b7]":"text-slate-500"}`}><Icon className="h-5 w-5"/>{label}</button>}

function Dashboard({todays,nextExam,statuses,setConfirm,setView,done,missed,total}:any){return <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="space-y-5"><section className="rounded-3xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#0879b7]">Aujourd’hui</p><h2 className="text-xl font-extrabold">Mes examens du jour</h2></div><Clock3 className="h-7 w-7 text-[#d5a913]"/></div>{todays.length?todays.map((e:any)=><ExamCard key={e.key} exam={e} status={statuses[e.key]} onStatus={()=>setConfirm(e)}/>):<div className="rounded-2xl bg-emerald-50 p-5 text-center"><Check className="mx-auto h-8 w-8 text-emerald-600"/><b className="mt-2 block">Aucun examen prévu aujourd’hui</b><p className="mt-1 text-sm text-emerald-800">Prépare tranquillement le prochain.</p></div>}</section>
  {nextExam&&<section className="rounded-3xl border border-[#ecd875] bg-[#fffbea] p-5"><p className="text-sm font-bold text-[#8a6800]">PROCHAIN EXAMEN</p><h3 className="mt-2 text-lg font-extrabold">{nextExam.course}</h3><p className="mt-1 flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4"/>{nextExam.dateLabel} · {nextExam.mode}</p></section>}</div>
  <aside className="space-y-4"><button onClick={()=>setView("exams")} className="flex w-full items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm"><span><CalendarDays className="mb-3 h-7 w-7 text-[#0879b7]"/><b className="block">Tous mes examens</b><small className="text-slate-500">S3, S4 et calendrier</small></span><ChevronRight/></button><button onClick={()=>setView("coupon")} className="flex w-full items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm"><span><Camera className="mb-3 h-7 w-7 text-[#0879b7]"/><b className="block">Vérifier mon coupon</b><small className="text-slate-500">Comparer automatiquement</small></span><ChevronRight/></button><div className="rounded-3xl bg-slate-900 p-5 text-white"><p className="text-sm text-slate-300">Bilan</p><p className="mt-2 text-2xl font-black">{done}/{total}</p><p className="text-sm text-slate-300">effectués · {missed} manqué{missed>1?"s":""}</p></div></aside></div>}

function ExamCard({exam,status,onStatus}:{exam:StudentExam;status?:ExamStatus;onStatus:()=>void}){const done=status==="done",missed=status==="missed";return <article className={`mb-3 rounded-2xl border p-4 last:mb-0 ${done?"border-emerald-200 bg-emerald-50":missed?"border-rose-200 bg-rose-50":"bg-white"}`}><div className="flex items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">S{exam.semester}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{exam.credits} cr.</span></div><h3 className="font-extrabold leading-6">{exam.course}</h3><p className="mt-1 text-sm text-slate-500">{exam.dateLabel} · {exam.mode}</p></div><button onClick={onStatus} aria-label="Changer le statut" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${done?"bg-emerald-600 text-white":missed?"bg-rose-600 text-white":"border-2 bg-white text-slate-400"}`}>{done?<Check/>:missed?<X/>:<span className="h-3 w-3 rounded-full bg-slate-200"/>}</button></div></article>}

function Exams({exams,statuses,setConfirm,filter,setFilter}:any){const opts=[["all","Tous"],["today","Aujourd’hui"],["s3","S3"],["s4","S4"],["todo","À faire"],["done","Effectués"],["missed","Manqués"]];return <section><div className="mb-5"><p className="text-sm font-bold text-[#0879b7]">MON PARCOURS</p><h2 className="text-2xl font-black">Tous mes examens</h2></div><div className="no-print mb-5 flex gap-2 overflow-x-auto pb-2">{opts.map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${filter===v?"bg-[#0879b7] text-white":"border bg-white"}`}>{l}</button>)}</div><div className="grid gap-3 md:grid-cols-2">{exams.length?exams.map((e:StudentExam)=><ExamCard key={e.key} exam={e} status={statuses[e.key]} onStatus={()=>setConfirm(e)}/>):<div className="col-span-full rounded-3xl border bg-white p-10 text-center text-slate-500">Aucun examen dans ce filtre.</div>}</div></section>}

function CourseLibrary({exams,resources,loading,error,onRetry}:{exams:StudentExam[];resources:LibraryResource[];loading:boolean;error:string|null;onRetry:()=>void}){
  const [search,setSearch]=useState("");
  const studentCourses=useMemo(()=>Array.from(new Set(exams.map(e=>e.course))),[exams]);
  const q=normalize(search);
  const courses=studentCourses.map(course=>{
    const docs=resources.filter(r=>normalize(r.course)===normalize(course));
    const visible=q?docs.filter(d=>normalize(d.title).includes(q)||normalize(d.course).includes(q)||normalize(d.category).includes(q)):docs;
    const courseMatch=!q||normalize(course).includes(q);
    return {course,docs:courseMatch?docs:visible,courseMatch};
  }).filter(item=>!q||item.courseMatch||item.docs.length>0);

  return <section>
    <p className="text-sm font-bold text-[#0879b7]">BIBLIOTHÈQUE</p>
    <h2 className="text-2xl font-black">Préparer mes examens</h2>
    <div className="my-5 flex items-center gap-3 rounded-2xl border bg-white px-4"><Search className="h-5 w-5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un titre ou un cours…" className="h-13 w-full outline-none"/></div>
    {loading&&<div className="mb-5 flex items-center justify-center gap-3 rounded-2xl border bg-white p-6 text-sm font-semibold text-[#0879b7]"><LoaderCircle className="h-5 w-5 animate-spin"/>Chargement des documents…</div>}
    {error&&<div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-semibold">{error}</p><button onClick={onRetry} className="mt-3 rounded-xl bg-white px-4 py-2 font-bold text-[#0879b7]">Réessayer</button></div>}
    {!loading&&!error&&resources.length===0&&<div className="mb-5 rounded-2xl border bg-slate-50 p-6 text-center text-sm text-slate-600">Aucun document n’est disponible pour le moment.</div>}
    {!loading&&!error&&resources.length>0&&courses.length===0&&<div className="mb-5 rounded-2xl border bg-slate-50 p-6 text-center text-sm text-slate-600">Aucun document ne correspond à votre recherche.</div>}
    <div className="grid gap-3 md:grid-cols-2">{courses.map(({course,docs})=>(
      <article key={course} className="rounded-3xl border bg-white p-5">
        <BookOpen className="h-7 w-7 text-[#0879b7]"/>
        <h3 className="mt-3 font-extrabold">{course}</h3>
        <p className="mt-1 text-sm text-slate-500">{docs.length?`${docs.length} document${docs.length>1?"s":""} disponible${docs.length>1?"s":""}`:"Aucun document disponible pour ce cours."}</p>
        {RESOURCE_CATEGORIES.map(category=>{
          const items=docs.filter(d=>d.category===category);
          if(!items.length) return null;
          return <div key={category} className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#b48b08]">{category}</p>{items.map(d=><ResourceLink key={d.id} resource={d}/>)}</div>;
        })}
        {docs.filter(d=>!RESOURCE_CATEGORIES.includes(d.category as typeof RESOURCE_CATEGORIES[number])).map(d=><ResourceLink key={d.id} resource={d}/>)}
      </article>
    ))}</div>
  </section>;
}

function ResourceLink({resource}:{resource:LibraryResource}){
  const url=publicResourceUrl(resource.file_path);
  const type=resourceTypeLabel(resource);
  return <div className="mt-3 rounded-xl bg-sky-50 p-3">
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0"><b className="block truncate text-sm text-sky-900">{resource.title}</b><small className="font-normal text-sky-700">{resource.category} · {type}</small></span>
    </div>
    <div className="mt-3 flex gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0879b7] px-3 py-2 text-xs font-bold text-white"><ExternalLink className="h-3.5 w-3.5"/>{isPdfResource(resource)?"Ouvrir le PDF":"Ouvrir"}</a>
      <a href={url} download={resource.filename} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0879b7] ring-1 ring-[#0879b7]/20"><Download className="h-3.5 w-3.5"/>Télécharger</a>
    </div>
  </div>;
}

function CouponCheck({exams}:{exams:StudentExam[]}){const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);const [text,setText]=useState("");const [preview,setPreview]=useState("");
  const analyze=async(file:File)=>{setPreview(URL.createObjectURL(file));setBusy(true);setText("");try{const T=await import("tesseract.js");const result=await T.recognize(file,"fra",{logger:m=>{if(m.progress)setProgress(Math.round(m.progress*100))}});setText(result.data.text)}catch{toast.error("La lecture a échoué. Utilisez une photo plus nette.")}finally{setBusy(false)}};
  const detected=exams.filter(e=>{const hay=normalize(text);const keys=[normalize(e.course),...(courseAliases[e.official]??[]).map(normalize)];return keys.some(k=>k.length>5&&hay.includes(k))});const missing=exams.filter(e=>!detected.includes(e));
  return <section><p className="text-sm font-bold text-[#0879b7]">VÉRIFICATION</p><h2 className="text-2xl font-black">Comparer mon coupon</h2><p className="mt-2 max-w-2xl text-slate-600">Prenez une photo nette, bien cadrée et sans reflet. L’analyse reste indicative : en cas de différence, consultez le CP.</p><label className="mt-6 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed border-sky-300 bg-white p-8 text-center"><Camera className="h-10 w-10 text-[#0879b7]"/><b className="mt-3">Photographier ou importer le coupon</b><span className="mt-1 text-sm text-slate-500">JPG ou PNG</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>e.target.files?.[0]&&analyze(e.target.files[0])}/></label>{busy&&<div className="mt-5 rounded-2xl bg-white p-5"><div className="flex justify-between text-sm font-bold"><span>Lecture du coupon…</span><span>{progress}%</span></div><Progress value={progress} className="mt-3"/></div>}{preview&&!busy&&<div className="mt-6 grid gap-5 lg:grid-cols-2"><SafeImg src={preview} alt="Coupon importé" className="max-h-96 w-full rounded-3xl border bg-white object-contain"/><div className="rounded-3xl border bg-white p-5"><h3 className="font-extrabold">Résultat de la comparaison</h3><p className="mt-1 text-sm text-slate-500">{detected.length} cours retrouvé{detected.length>1?"s":""} sur {exams.length}</p><div className="mt-4 max-h-72 space-y-2 overflow-auto">{detected.map(e=><div key={e.key} className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm"><Check className="h-5 w-5 shrink-0 text-emerald-600"/><span>{e.course}</span></div>)}{missing.map(e=><div key={e.key} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm"><CircleAlert className="h-5 w-5 shrink-0 text-amber-600"/><span>{e.course} — non détecté</span></div>)}</div><div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">Une différence ne constitue pas une décision officielle. Présentez le coupon au CP.</div></div></div>}</section>}
