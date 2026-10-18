import {useEffect,useState} from 'react';
import {supabase} from './lib';
import type {Branch} from './lib';
type Template={id:string;branch_id:string;weekday:number;shift_code:string;activity:string};
type Handoff={id:string;branch_id:string;work_date:string;shift_code:string;created_by:string;submitted_at:string|null;received_by:string|null;received_at:string|null};
type Check={id:string;handoff_id:string;template_id:string;status:string;reason:string|null;validation:string|null;validation_note:string|null};
const dayName=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const shiftName:{[key:string]:string}={m:'Matutino',v:'Vespertino',u:'Turno único'};
function localDay(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
export default function CleaningModule({branches,userId,manager}:{branches:Branch[];userId:string;manager:boolean}){
 const[branch,setBranch]=useState(''),[date,setDate]=useState(localDay()),[shift,setShift]=useState('m'),[templates,setTemplates]=useState<Template[]>([]),[handoffs,setHandoffs]=useState<Handoff[]>([]),[checks,setChecks]=useState<Check[]>([]),[note,setNote]=useState<Record<string,string>>({}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const day=new Date(date+'T12:00:00').getDay(),weekday=(day+6)%7;
 useEffect(()=>{if(!branch&&branches.length)setBranch(branches[0].id)},[branches,branch]);
 async function load(){if(!supabase)return;const[t,h,c]=await Promise.all([supabase.from('cleaning_templates').select('*').eq('active',true),supabase.from('cleaning_handoffs').select('*').order('work_date',{ascending:false}).limit(120),supabase.from('cleaning_checks').select('*').limit(1500)]);if(t.error||h.error||c.error)setMsg([t.error?.message,h.error?.message,c.error?.message].filter(Boolean).join('; '));setTemplates(t.data??[]);setHandoffs(h.data??[]);setChecks(c.data??[])}
 useEffect(()=>{load()},[]);
 const available=templates.filter(t=>t.branch_id===branch&&t.weekday===weekday),shifts=[...new Set(available.map(t=>t.shift_code))],selectedShift=shifts.includes(shift)?shift:(shifts[0]??shift);
 const current=handoffs.find(h=>h.branch_id===branch&&h.work_date===date&&h.shift_code===selectedShift);
 const tasks=checks.filter(c=>c.handoff_id===current?.id);
 const templateName=(id:string)=>templates.find(t=>t.id===id)?.activity??'Actividad';
 const canEdit=!!current&&!current.submitted_at&&(current.created_by===userId||manager);
 const canValidate=!!current?.submitted_at&&!current.received_at&&(current.created_by!==userId||manager);
 async function call(fn:string,args:Record<string,unknown>){if(!supabase)return;setBusy(true);setMsg('');try{const{error}=await supabase.rpc(fn,args);if(error)throw error;setMsg('Guardado correctamente.');await load()}catch(e){setMsg(e instanceof Error?e.message:'No se pudo guardar')}finally{setBusy(false)}}
 return <section className="panel" id="fsb-limpieza"><h2>Pendientes y Supervisión de Turnos</h2><p className="muted">Checklist por sucursal y turno, entrega firmada con la cuenta y validación de recepción.</p>
 <div className="grid"><label className="field">Sucursal<select value={branch} onChange={e=>setBranch(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="field">Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <p><strong>{dayName[weekday]}</strong> · {available.length===0?'Sin actividades programadas':shifts.length+' turno(s) programado(s)'}</p>
 {available.length===0?<p className="notice">{branches.find(b=>b.id===branch)?.name==='Alondras'&&weekday===6?'Alondras está cerrada los domingos. No se generan pendientes.':'No hay actividades configuradas para esta fecha.'}</p>:<>
 <label className="field">Turno<select value={selectedShift} onChange={e=>setShift(e.target.value)}>{shifts.map(s=><option key={s} value={s}>{shiftName[s]}</option>)}</select></label>
 {!current?<><p>Actividades programadas: {available.filter(t=>t.shift_code===selectedShift).length}</p><button className="btn" disabled={busy} onClick={()=>call('cleaning_start',{p_branch:branch,p_date:date,p_shift:selectedShift})}>Abrir checklist del turno</button></>:<>
 <p className="muted">Estado: <strong>{current.received_at?'Recibido y firmado':current.submitted_at?'Entregado, pendiente de recepción':'En proceso'}</strong></p>
 {tasks.map(t=><div className="panel" key={t.id}><strong>{templateName(t.template_id)}</strong><p className="muted">Registro: {t.status==='done'?'Realizada':t.status==='blocked'?'No realizada':t.status==='na'?'No aplica':'Sin registrar'}{t.reason?' · '+t.reason:''}</p>
 {canEdit&&<><label className="field">Resultado<select value={selectedStatus[t.id]??t.status} disabled={busy} onChange={e=>{const v=e.target.value;setSelectedStatus(p=>({...p,[t.id]:v}));if(v==='done'||v==='pending')call('cleaning_mark',{p_check:t.id,p_status:v,p_reason:null});else setMsg('Escribe el motivo y pulsa Guardar observación / pendiente.')}}><option value="pending">Sin registrar</option><option value="done">Realizada</option><option value="blocked">No realizada</option><option value="na">No aplica</option></select></label><label className="field">Justificación / observación<input value={note[t.id]??t.reason??''} onChange={e=>setNote(p=>({...p,[t.id]:e.target.value}))} placeholder="Obligatoria si no se realizó"/></label><button className="btn secondary" disabled={busy} onClick={()=>call('cleaning_mark',{p_check:t.id,p_status:selectedStatus[t.id]??t.status,p_reason:note[t.id]??t.reason})}>Guardar observación / pendiente</button></>}
 {current.submitted_at&&<><p>Recepción: <strong>{t.validation==='accepted'?'Conforme':t.validation==='disputed'?'Con observación':'Sin validar'}</strong>{t.validation_note?' · '+t.validation_note:''}</p>{canValidate&&<><input placeholder="Observación si no estás conforme" value={note['v'+t.id]??''} onChange={e=>setNote(p=>({...p,['v'+t.id]:e.target.value}))}/><button className="btn secondary" disabled={busy} onClick={()=>call('cleaning_validate',{p_check:t.id,p_validation:'accepted',p_note:null})}>Conforme</button> <button className="btn secondary" disabled={busy} onClick={()=>call('cleaning_validate',{p_check:t.id,p_validation:'disputed',p_note:note['v'+t.id]??''})}>No conforme</button></>}</>}
 </div>)}
 {canEdit&&<button className="btn" disabled={busy||tasks.length===0||tasks.some(t=>t.status==='pending')} onClick={()=>call('cleaning_submit',{p_handoff:current.id})}>Firmar y entregar turno</button>}
 {canValidate&&<button className="btn" disabled={busy||tasks.some(t=>!t.validation)} onClick={()=>call('cleaning_receive',{p_handoff:current.id,p_note:null})}>Firmar recepción del turno</button>}
 </>}
 </>}
 {manager&&<div className="panel"><h3>Supervisión de Gerencia</h3><p className="muted">Entregas recientes y pendientes de validación</p>{handoffs.slice(0,20).map(h=><p key={h.id}>{branches.find(b=>b.id===h.branch_id)?.name} · {h.work_date} · {shiftName[h.shift_code]} — {h.received_at?'Recibido':h.submitted_at?'Pendiente de recepción':'Sin entregar'} · {checks.filter(c=>c.handoff_id===h.id&&c.status==='blocked').length} pendientes</p>)}</div>}
 {msg&&<p className="notice" role="status">{msg}</p>}
 </section>
}