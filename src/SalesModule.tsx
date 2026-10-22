import {useEffect,useState} from 'react';
import type {FormEvent} from 'react';
import {supabase} from './lib';
import type {Branch} from './lib';

type SaleVisit={id:string;employee_id:string;attendance_id:string;branch_id:string;visited_at:string;people_count:number;buyer_type:string;approximate_age:string;time_in_store:string;existing_customer:string;discovery_source:string|null;made_purchase:boolean;categories:string[];units:number;total:number;payment_method:string|null};
const buyerTypes=['Hombre','Mujer','Pareja','Grupo','Otro'];
const ages=['18–24','25–34','35–44','45–54','55+','No sabe'];
const times=['Menos de 5 min','5–10 min','11–20 min','21–30 min','31+ min'];
const sources=['Pasó por sucursal','Recomendación','Facebook','Instagram','Google','TikTok','Otro','No sabe / no preguntó'];
const productFamilies=[
 {name:'Juguetería',types:['Dildos','Vibradores','Succionadores','Masturbadores','Plugs','Anillos','Bolas / ejercitadores','Otros juguetes']},
 {name:'Lubricantes',types:['Base agua','Base silicona','Híbridos','Aceites / masaje','Geles íntimos','Otros lubricantes']},
 {name:'Lencería',types:['Conjuntos','Babydolls','Bodys','Medias','Tangas / ropa interior','Otros de lencería']},
 {name:'Estimulantes / Potenciadores',types:['Líquidos estimulantes','Pastillas para hombre','Pastillas para mujer','Retardantes','Sprays estimulantes','Geles estimulantes','Otros estimulantes']},
 {name:'Salud sexual',types:['Condones','Higiene íntima','Cuidado sexual','Otros de salud sexual']},
 {name:'Cosmética / Sensualidad',types:['Perfumes','Feromonas','Cremas','Aceites corporales','Otros cosméticos']},
 {name:'Disfraces',types:['Disfraz completo','Prenda temática','Accesorio de disfraz','Otros disfraces']},
 {name:'Accesorios',types:['Esposas','Antifaces','Complementos','Otros accesorios']},
 {name:'Otro',types:['Otro producto']}
];
const payments=['Efectivo','Tarjeta','Transferencia','Mixto','Otro'];

export default function SalesModule({userId,attendanceId,branchId,branches,manager,shiftHours}:{userId:string;attendanceId:string|null;branchId:string|null;branches:Branch[];manager:boolean;shiftHours:number}){
 const[items,setItems]=useState<SaleVisit[]>([]),[expandedFamily,setExpandedFamily]=useState<string|null>(null),[people,setPeople]=useState(1),[buyer,setBuyer]=useState('Hombre'),[age,setAge]=useState('25–34'),[time,setTime]=useState('Menos de 5 min'),[existing,setExisting]=useState('Sí'),[source,setSource]=useState(''),[purchase,setPurchase]=useState(false),[categories,setCategories]=useState<string[]>([]),[units,setUnits]=useState(1),[total,setTotal]=useState(''),[payment,setPayment]=useState('Efectivo'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function load(){if(!supabase)return;let q=supabase.from('sales_visits').select('*').order('visited_at',{ascending:false}).limit(manager?200:30);if(!manager)q=q.eq('employee_id',userId);const{data,error}=await q;if(error)setMsg(error.message);else setItems((data??[]) as SaleVisit[])}
 useEffect(()=>{void load()},[userId,manager]);
 function toggleCategory(family:string,type:string){const value=family+' > '+type;setCategories(v=>v.includes(value)?v.filter(x=>x!==value):[...v,value])}
 async function save(e:FormEvent){e.preventDefault();if(!supabase)return;if(!attendanceId||!branchId){setMsg('Primero registra tu entrada para comenzar a capturar visitas.');return;}if(purchase&&(!categories.length||units<1||Number(total)<=0||!payment)){setMsg('Completa categoría, unidades, total y método de pago.');return;}setBusy(true);setMsg('');try{const{error}=await supabase.from('sales_visits').insert({employee_id:userId,attendance_id:attendanceId,branch_id:branchId,people_count:people,buyer_type:buyer,approximate_age:age,time_in_store:time,existing_customer:existing,discovery_source:existing==='Sí'?null:(source||'No sabe / no preguntó'),made_purchase:purchase,categories:purchase?categories:[],units:purchase?units:0,total:purchase?Number(total):0,payment_method:purchase?payment:null});if(error)throw error;setPeople(1);setBuyer('Hombre');setAge('25–34');setTime('Menos de 5 min');setExisting('Sí');setSource('');setPurchase(false);setCategories([]);setUnits(1);setTotal('');setPayment('Efectivo');await load();setMsg('Visita registrada correctamente.')}catch(e){setMsg(e instanceof Error?e.message:'No se pudo guardar la visita')}finally{setBusy(false)}}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana'}).format(new Date());
 const mineToday=items.filter(x=>x.employee_id===userId&&new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana'}).format(new Date(x.visited_at))===today);
 const visits=mineToday.length,visitors=mineToday.reduce((a,x)=>a+x.people_count,0),purchases=mineToday.filter(x=>x.made_purchase).length,sales=mineToday.reduce((a,x)=>a+Number(x.total),0);
 const journey=attendanceId?items.filter(x=>x.attendance_id===attendanceId):mineToday;
 const journeySales=journey.reduce((a,x)=>a+Number(x.total),0);
 const branchName=branches.find(b=>b.id===branchId)?.name??'';
 const alondras=branchName.toLowerCase().includes('alondra');
 const limits=alondras?[3500,7000]:shiftHours>0&&shiftHours<=6.5?[2625,5250]:[5250,10500];
 const rate=journeySales<=0?0:journeySales<=limits[0]?1:journeySales<=limits[1]?2.5:4;
 const next=rate===0||rate===1?limits[0]+1:rate===2.5?limits[1]+1:null;
 const commission=journeySales*rate/100;
 return <section className="panel" id="fsb-ventas"><h2>Ventas y visitas</h2><p className="muted">Registra cada cliente o grupo que entra a la tienda. Cada registro cuenta automáticamente como 1 visita; tú solo indicas cuántas personas entraron juntas.</p>
 {!attendanceId&&<p className="notice">Necesitas tener una jornada abierta para registrar visitas.</p>}
 <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}><div className="panel"><small>Visitas hoy</small><h2>{visits}</h2></div><div className="panel"><small>Personas hoy</small><h2>{visitors}</h2></div><div className="panel"><small>Compras</small><h2>{purchases}</h2></div><div className="panel"><small>Venta registrada</small><h2>${sales.toLocaleString('es-MX',{minimumFractionDigits:2})}</h2></div></div>
 <div className="panel"><h3>Mi comisión de esta jornada</h3><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}><div><small>Venta acumulada</small><h2>${journeySales.toLocaleString('es-MX',{minimumFractionDigits:2})}</h2></div><div><small>Comisión actual</small><h2>{rate}%</h2></div><div><small>Comisión estimada</small><h2>${commission.toLocaleString('es-MX',{minimumFractionDigits:2})}</h2></div></div>${next!==null&&<p className="notice">🔥 Te faltan <strong>${Math.max(0,next-journeySales).toLocaleString('es-MX',{minimumFractionDigits:2})}</strong> en ventas para llegar al siguiente rango.</p>}<small>El rango se calcula automáticamente según tu sucursal y duración de jornada.</small></div><form onSubmit={save}><h3>Nueva visita</h3><p className="muted">Sucursal: <strong>{branches.find(b=>b.id===branchId)?.name??'Registra tu entrada'}</strong></p>
 <label className="field">¿Cuántas personas entraron juntas?<select value={people} onChange={e=>setPeople(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}{n===10?' o más':''}</option>)}</select></label>
 <div className="grid"><label className="field">¿Quién entró?<select value={buyer} onChange={e=>setBuyer(e.target.value)}>{buyerTypes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Edad aproximada<select value={age} onChange={e=>setAge(e.target.value)}>{ages.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Tiempo en tienda<select value={time} onChange={e=>setTime(e.target.value)}>{times.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">¿Ya era cliente?<select value={existing} onChange={e=>setExisting(e.target.value)}><option>Sí</option><option>No</option><option>No sabe</option></select></label></div>
 {existing!=='Sí'&&<label className="field">¿Cómo nos conoció?<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Selecciona</option>{sources.map(x=><option key={x}>{x}</option>)}</select></label>}
 <label style={{display:'flex',gap:12,alignItems:'center',margin:'18px 0'}}><input type="checkbox" checked={purchase} onChange={e=>setPurchase(e.target.checked)}/><strong>¿Realizó compra?</strong></label>
 {purchase&&<div className="panel"><strong>Productos comprados</strong><p className="muted">Elige una familia y después marca uno o más tipos de producto. Puedes seleccionar varias familias en la misma venta.</p><div className="tabs">{productFamilies.map(f=><button type="button" key={f.name} className={'btn '+(expandedFamily===f.name?'':'secondary')} onClick={()=>setExpandedFamily(expandedFamily===f.name?null:f.name)}>{f.name}</button>)}</div>{expandedFamily&&<div className="panel"><strong>{expandedFamily}</strong><p className="muted">Selecciona uno o más tipos:</p><div className="tabs">{productFamilies.find(f=>f.name===expandedFamily)?.types.map(t=>{const value=expandedFamily+' > '+t;return <button type="button" key={t} className={'btn '+(categories.includes(value)?'':'secondary')} onClick={()=>toggleCategory(expandedFamily,t)}>{t}</button>})}</div></div>}{categories.length>0&&<div className="notice"><strong>Seleccionados:</strong><br/>{categories.map(x=><span key={x} className="tag" style={{display:'inline-block',margin:'4px'}}>{x.replace(' > ',' · ')}</span>)}</div>}<div className="grid"><label className="field">Unidades<input type="number" min="1" value={units} onChange={e=>setUnits(Number(e.target.value))}/></label><label className="field">Total de la venta<input type="number" min="0.01" step="0.01" inputMode="decimal" value={total} onChange={e=>setTotal(e.target.value)} placeholder="0.00"/></label><label className="field">Método de pago<select value={payment} onChange={e=>setPayment(e.target.value)}>{payments.map(x=><option key={x}>{x}</option>)}</select></label></div></div>}
 <button className="btn big" disabled={busy||!attendanceId||!branchId}>{busy?'Guardando…':'Guardar visita'}</button></form>
 {msg&&<p className="notice" role="status">{msg}</p>}
 <h3>Mis registros recientes</h3>{mineToday.slice(0,10).map(x=><p key={x.id}><strong>{new Date(x.visited_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</strong> · {x.people_count} {x.people_count===1?'persona':'personas'} · {x.made_purchase?'Compra $'+Number(x.total).toLocaleString('es-MX'):'Sin compra'}</p>)}
 </section>
}