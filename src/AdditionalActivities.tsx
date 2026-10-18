import {useEffect,useState} from 'react';
import {supabase} from './lib';
import type {Branch} from './lib';

type Extra={id:string;employee_id:string;branch_id:string;work_date:string;category:string;description:string;created_at:string};
const categories=['Apoyo al inventario','Traslado de mercancía','Preparación de mayoreo','Registro de nuevas entradas','Atención y apoyo en tienda','Otra actividad'];
function todayTijuana(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export default function AdditionalActivities({userId,manager,hasOpenAttendance,assignedBranchId,branches}:{userId:string;manager:boolean;hasOpenAttendance:boolean;assignedBranchId:string|null;branches:Branch[]}){
 const[items,setItems]=useState<Extra[]>([]),[category,setCategory]=useState(categories[0]),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[branchFilter,setBranchFilter]=useState('all');
 const today=todayTijuana();
 async function load(){if(!supabase)return;let query=supabase.from('additional_work_activities').select('*').order('created_at',{ascending:false}).limit(150);if(!manager)query=query.eq('employee_id',userId).eq('work_date',today);const{data,error}=await query;if(error)setMessage(error.message);else setItems(data??[])}
 useEffect(()=>{void load()},[userId,manager,today]);
 async function save(e:React.FormEvent){e.preventDefault();if(!supabase)return;if(!assignedBranchId){setMessage('No se identificó una sucursal. Registra tu entrada o consulta a Gerencia.');return;}if(!manager&&!hasOpenAttendance){setMessage('Para registrar actividades debes tener una jornada abierta.');return;}if(description.trim().length<5){setMessage('Describe la actividad con al menos 5 caracteres.');return;}setBusy(true);setMessage('');try{const{error}=await supabase.from('additional_work_activities').insert({employee_id:userId,branch_id:assignedBranchId,work_date:today,category,description:description.trim()});if(error)throw error;setDescription('');await load();setMessage('Actividad adicional registrada correctamente.')}catch(error){setMessage(error instanceof Error?error.message:'No se pudo guardar')}finally{setBusy(false)}}
 const visible=items.filter(i=>branchFilter==='all'||i.branch_id===branchFilter);
 return <div className="panel" id="fsb-otras-actividades">
 <h2>Otras actividades realizadas hoy</h2><p className="muted">Registra tareas adicionales a la limpieza. Cada actividad queda asociada a tu cuenta, fecha y sucursal; no modifica la lista de limpieza ni la checada.</p>
 <form onSubmit={save}>
 <label className="field">Tipo de actividad<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 <label className="field">¿Qué hiciste?<textarea rows={3} maxLength={1500} required minLength={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ej. Organicé y conté la mercancía nueva, registré las diferencias y entregué el reporte." /></label>
 <button className="btn" type="submit" disabled={busy||!assignedBranchId||(!manager&&!hasOpenAttendance)||description.trim().length<5}>{busy?'Guardando…':'Guardar actividad adicional'}</button>
 {!manager&&!hasOpenAttendance&&<p className="muted">Puedes consultar tus registros, pero necesitas tener una jornada abierta para agregar actividades.</p>}
 </form>
 {message&&<p className="notice" role="status">{message}</p>}
 <h3>{manager?'Registro de actividades adicionales':'Mis actividades adicionales de hoy'}</h3>
 {manager&&<label className="field">Filtrar sucursal<select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}><option value="all">Todas las sucursales</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
 {visible.length===0?<p className="muted">Todavía no hay actividades adicionales registradas.</p>:visible.map(item=><div className="panel" key={item.id}><strong>{item.category}</strong><p>{item.description}</p><small className="muted">{item.work_date} · {branches.find(b=>b.id===item.branch_id)?.name??'Sucursal'} · {new Date(item.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}{manager?' · Cuenta: '+item.employee_id:''}</small></div>)}
 </div>
}
