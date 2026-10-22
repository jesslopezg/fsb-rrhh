import {useEffect,useState} from 'react';
import type {FormEvent} from 'react';
import {supabase} from './lib';
import type {Branch} from './lib';

type SaleVisit={id:string;employee_id:string;attendance_id:string;branch_id:string;visited_at:string;people_count:number;buyer_type:string;approximate_age:string;time_in_store:string;existing_customer:string;discovery_source:string|null;made_purchase:boolean;categories:string[];units:number;total:number;payment_method:string|null};
const buyerTypes=['Hombre','Mujer','Pareja','Grupo','Otro'];
const ages=['18–24','25–34','35–44','45–54','55+','No sabe'];
const times=['Menos de 5 min','5–10 min','11–20 min','21–30 min','31+ min'];
const sources=['Pasó por sucursal','Recomendación','Facebook','Instagram','Google','TikTok','Otro','No sabe / no preguntó'];
const categoryOptions=[
 {name:'Juguetería',example:'Vibradores, succionadores, anillos, masturbadores, plugs y dildos.'},
 {name:'Lubricantes',example:'Lubricantes base agua o silicona, geles y aceites íntimos.'},
 {name:'Lencería',example:'Conjuntos, babydolls, medias, bodys y tangas.'},
 {name:'Estimulantes / Potenciadores',example:'Pastillas y productos estimulantes para hombre o mujer, retardantes como Stud 100, sprays y geles estimulantes.'},
 {name:'Poppers',example:'Productos vendidos como poppers.'},
 {name:'Salud sexual',example:'Condones y productos de higiene o cuidado sexual.'},
 {name:'Cosmética',example:'Perfumes, feromonas, cremas y productos cosméticos.'},
 {name:'Disfraces',example:'Disfraces completos y prendas temáticas.'},
 {name:'Accesorios',example:'Esposas, antifaces y otros complementos.'},
 {name:'Otro',example:'Solo si el artículo no corresponde claramente a ninguna categoría anterior.'}
];
const payments=['Efectivo','Tarjeta','Transferencia','Mixto','Otro'];

export default function SalesModule({userId,attendanceId,branchId,branches,manager}:{userId:string;attendanceId:string|null;branchId:string|null;branches:Branch[];manager:boolean}){
 const[items,setItems]=useState<SaleVisit[]>([]),[categoryHelp,setCategoryHelp]=useState<string|null>(null),[people,setPeople]=useState(1),[buyer,setBuyer]=useState('Hombre'),[age,setAge]=useState('25–34'),[time,setTime]=useState('Menos de 5 min'),[existing,setExisting]=useState('Sí'),[source,setSource]=useState(''),[purchase,setPurchase]=useState(false),[categories,setCategories]=useState<string[]>([]),[units,setUnits]=useState(1),[total,setTotal]=useState(''),[payment,setPayment]=useState('Efectivo'),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function load(){if(!supabase)return;let q=supabase.from('sales_visits').select('*').order('visited_at',{ascending:false}).limit(manager?200:30);if(!manager)q=q.eq('employee_id',userId);const{data,error}=await q;if(error)setMsg(error.message);else setItems((data??[]) as SaleVisit[])}
 useEffect(()=>{void load()},[userId,manager]);
 function toggleCategory(c:string){setCategories(v=>v.includes(c)?v.filter(x=>x!==c):[...v,c])}
 async function save(e:FormEvent){e.preventDefault();if(!supabase)return;if(!attendanceId||!branchId){setMsg('Primero registra tu entrada para comenzar a capturar visitas.');return;}if(purchase&&(!categories.length||units<1||Number(total)<=0||!payment)){setMsg('Completa categoría, unidades, total y método de pago.');return;}setBusy(true);setMsg('');try{const{error}=await supabase.from('sales_visits').insert({employee_id:userId,attendance_id:attendanceId,branch_id:branchId,people_count:people,buyer_type:buyer,approximate_age:age,time_in_store:time,existing_customer:existing,discovery_source:existing==='Sí'?null:(source||'No sabe / no preguntó'),made_purchase:purchase,categories:purchase?categories:[],units:purchase?units:0,total:purchase?Number(total):0,payment_method:purchase?payment:null});if(error)throw error;setPeople(1);setBuyer('Hombre');setAge('25–34');setTime('Menos de 5 min');setExisting('Sí');setSource('');setPurchase(false);setCategories([]);setUnits(1);setTotal('');setPayment('Efectivo');await load();setMsg('Visita registrada correctamente.')}catch(e){setMsg(e instanceof Error?e.message:'No se pudo guardar la visita')}finally{setBusy(false)}}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana'}).format(new Date());
 const mineToday=items.filter(x=>x.employee_id===userId&&new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tijuana'}).format(new Date(x.visited_at))===today);
 const visits=mineToday.length,visitors=mineToday.reduce((a,x)=>a+x.people_count,0),purchases=mineToday.filter(x=>x.made_purchase).length,sales=mineToday.reduce((a,x)=>a+Number(x.total),0);
 return <section className="panel" id="fsb-ventas"><h2>Ventas y visitas</h2><p className="muted">Registra cada cliente o grupo que entra a la tienda. Cada registro cuenta automáticamente como 1 visita; tú solo indicas cuántas personas entraron juntas.</p>
 {!attendanceId&&<p className="notice">Necesitas tener una jornada abierta para registrar visitas.</p>}
 <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}><div className="panel"><small>Visitas hoy</small><h2>{visits}</h2></div><div className="panel"><small>Personas hoy</small><h2>{visitors}</h2></div><div className="panel"><small>Compras</small><h2>{purchases}</h2></div><div className="panel"><small>Venta registrada</small><h2>${sales.toLocaleString('es-MX',{minimumFractionDigits:2})}</h2></div></div>
 <form onSubmit={save}><h3>Nueva visita</h3><p className="muted">Sucursal: <strong>{branches.find(b=>b.id===branchId)?.name??'Registra tu entrada'}</strong></p>
 <label className="field">¿Cuántas personas entraron juntas?<select value={people} onChange={e=>setPeople(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}{n===10?' o más':''}</option>)}</select></label>
 <div className="grid"><label className="field">¿Quién entró?<select value={buyer} onChange={e=>setBuyer(e.target.value)}>{buyerTypes.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Edad aproximada<select value={age} onChange={e=>setAge(e.target.value)}>{ages.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">Tiempo en tienda<select value={time} onChange={e=>setTime(e.target.value)}>{times.map(x=><option key={x}>{x}</option>)}</select></label><label className="field">¿Ya era cliente?<select value={existing} onChange={e=>setExisting(e.target.value)}><option>Sí</option><option>No</option><option>No sabe</option></select></label></div>
 {existing!=='Sí'&&<label className="field">¿Cómo nos conoció?<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Selecciona</option>{sources.map(x=><option key={x}>{x}</option>)}</select></label>}
 <label style={{display:'flex',gap:12,alignItems:'center',margin:'18px 0'}}><input type="checkbox" checked={purchase} onChange={e=>setPurchase(e.target.checked)}/><strong>¿Realizó compra?</strong></label>
 {purchase&&<div className="panel"><strong>Categorías compradas</strong><p className="muted">Selecciona todas las categorías que incluya la venta. Toca una categoría para seleccionarla y ver ejemplos.</p><div className="tabs">{categoryOptions.map(c=><button type="button" key={c.name} className={'btn '+(categories.includes(c.name)?'':'secondary')} onClick={()=>{toggleCategory(c.name);setCategoryHelp(c.name)}}>{c.name}</button>)}</div>{categoryHelp&&<div className="notice"><strong>{categoryHelp}</strong><br/>{categoryOptions.find(c=>c.name===categoryHelp)?.example}</div>}<div className="grid"><label className="field">Unidades<input type="number" min="1" value={units} onChange={e=>setUnits(Number(e.target.value))}/></label><label className="field">Total de la venta<input type="number" min="0.01" step="0.01" inputMode="decimal" value={total} onChange={e=>setTotal(e.target.value)} placeholder="0.00"/></label><label className="field">Método de pago<select value={payment} onChange={e=>setPayment(e.target.value)}>{payments.map(x=><option key={x}>{x}</option>)}</select></label></div></div>}
 <button className="btn big" disabled={busy||!attendanceId||!branchId}>{busy?'Guardando…':'Guardar visita'}</button></form>
 {msg&&<p className="notice" role="status">{msg}</p>}
 <h3>Mis registros recientes</h3>{mineToday.slice(0,10).map(x=><p key={x.id}><strong>{new Date(x.visited_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</strong> · {x.people_count} {x.people_count===1?'persona':'personas'} · {x.made_purchase?'Compra $'+Number(x.total).toLocaleString('es-MX'):'Sin compra'}</p>)}
 </section>
}