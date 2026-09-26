import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Home, TrendingUp, TrendingDown, CreditCard, Target, BarChart3, Settings,
  Plus, Bell, LogOut, Wallet, PiggyBank, Clock3, ReceiptText, UserRound,
  CalendarDays, ChevronRight, X, Save, Eye, EyeOff, CheckCircle2
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from 'recharts'
import './styles.css'

const COLORS = ['#1368ff', '#7657ff', '#16b8a5', '#ff9f1c', '#ff5b65', '#91a4bd']

const DEFAULT_EXPENSES = [
  { id: 1, desc: 'Recarga de Celular', amount: 25, category: 'Moradia', status: 'Pago', kind: 'Fixa', date: '2026-09-03', by: 'Marcos' },
  { id: 2, desc: 'Academia', amount: 230, category: 'Cuidado pessoal', status: 'Pago', kind: 'Fixa', date: '2026-09-04', by: 'Carol' },
  { id: 3, desc: 'Consórcio casa 1/240', amount: 962.40, category: 'Aquisição de bens', status: 'Pago', kind: 'Parcelada', date: '2026-09-10', by: 'Marcos' },
  { id: 4, desc: 'Copasa', amount: 111.90, category: 'Moradia', status: 'Pago', kind: 'Fixa', date: '2026-09-09', by: 'Carol' },
  { id: 5, desc: 'Aluguel', amount: 901, category: 'Moradia', status: 'Pago', kind: 'Fixa', date: '2026-09-25', by: 'Marcos' },
  { id: 6, desc: 'Tio Carlos 2/5', amount: 790, category: 'Empréstimo', status: 'Pago', kind: 'Parcelada', date: '2026-09-10', by: 'Marcos' },
  { id: 7, desc: 'Acordo Unipam Marcos 1/25', amount: 1215, category: 'Negociações', status: 'Pago', kind: 'Parcelada', date: '2026-09-22', by: 'Marcos' },
  { id: 8, desc: 'Acordo Unipam Carol 1/20', amount: 1275, category: 'Negociações', status: 'Pago', kind: 'Parcelada', date: '2026-09-22', by: 'Carol' },
  { id: 9, desc: 'Notebook 6/6', amount: 264.77, category: 'Investimento', status: 'Pago', kind: 'Parcelada', date: '2026-09-10', by: 'Marcos' },
]

const DEFAULT_INCOMES = [
  { id: 1, desc: 'Gráfica', amount: 600, status: 'Recebida', kind: 'Recorrente', date: '2026-09-03', by: 'Marcos' },
  { id: 2, desc: 'Carol Rial Consultoria', amount: 9000, status: 'Recebida', kind: 'Recorrente', date: '2026-09-04', by: 'Carol' },
]

const DEFAULT_CARDS = [
  { id: 1, name: 'Nubank', limit: 2000, used: 875.40, close: '10/09', due: '20/09' },
  { id: 2, name: 'Inter', limit: 1500, used: 310.25, close: '18/09', due: '28/09' },
  { id: 3, name: 'PicPay', limit: 600, used: 185.10, close: '25/09', due: '05/10' },
]

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const getStore = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback } }
const setStore = (key, value) => localStorage.setItem(key, JSON.stringify(value))

function Auth({ onLogin }){
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = e => {
    e.preventDefault(); setMsg('')
    const clean = name.trim()
    if (!clean) return setMsg('Digite seu nome.')
    if (!/^\d{4}$/.test(pin)) return setMsg('O PIN deve ter exatamente 4 números.')
    const users = getStore('cm_users', [])
    if (mode === 'register') {
      if (users.some(u => u.name.toLowerCase() === clean.toLowerCase())) return setMsg('Esse nome já está cadastrado neste dispositivo.')
      const user = { id: crypto.randomUUID?.() || String(Date.now()), name: clean, pin }
      setStore('cm_users', [...users, user]); setStore('cm_session', user); onLogin(user)
    } else {
      const user = users.find(u => u.name.toLowerCase() === clean.toLowerCase() && u.pin === pin)
      if (!user) return setMsg('Nome ou PIN incorretos.')
      setStore('cm_session', user); onLogin(user)
    }
  }

  return <div className="auth-shell">
    <section className="auth-brand">
      <div className="brand-mark"><BarChart3 size={52}/></div>
      <h1>Carol <span>&</span> Marcos</h1>
      <p className="brand-sub">CONTROLE FINANCEIRO</p>
      <div className="brand-line"/>
      <p className="brand-tag">Planejamento hoje para grandes conquistas amanhã.</p>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Faça seu login' : 'Criar usuário'}</h2>
        <p>{mode === 'login' ? 'Acesse sua conta para cuidar das suas finanças.' : 'Cadastre seu nome e um PIN de quatro dígitos.'}</p>
        <label>Nome</label>
        <div className="field"><UserRound size={20}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Marcos"/></div>
        <label>PIN de 4 dígitos</label>
        <div className="field"><input inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} type={showPin ? 'text':'password'} placeholder="••••"/><button className="icon-btn" type="button" onClick={()=>setShowPin(v=>!v)}>{showPin?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        {msg && <div className="auth-msg">{msg}</div>}
        <button className="primary-btn" type="submit">{mode === 'login' ? 'Entrar' : 'Cadastrar e entrar'}</button>
        <button className="link-btn" type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('')}}>{mode === 'login' ? 'Primeiro acesso? Criar usuário' : 'Já tenho usuário'}</button>
        <div className="verse-card"><div>📖</div><p>“Os planos do diligente certamente levam à vantagem, mas todo apressado certamente chega à pobreza.”</p><strong>PROVÉRBIOS 21:5</strong></div>
      </form>
    </section>
  </div>
}

function Stat({icon:Icon, label, value, tone='blue', sub}){
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={24}/></div><div><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div></div>
}

function Sidebar({page,setPage,user,onLogout}){
  const items = [['dashboard','Início',Home],['receitas','Receitas',TrendingUp],['despesas','Despesas',TrendingDown],['cartoes','Cartões',CreditCard],['planejamento','Planejamento',Target],['relatorios','Relatórios',BarChart3],['config','Configurações',Settings]]
  return <aside className="sidebar"><div className="sidebar-brand"><BarChart3/><div><b>Carol <span>&</span> Marcos</b><small>CONTROLE FINANCEIRO</small></div></div><nav>{items.map(([k,l,I])=><button key={k} className={page===k?'active':''} onClick={()=>setPage(k)}><I size={20}/><span>{l}</span></button>)}</nav><div className="sidebar-foot"><div className="user-dot">{user.name[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>Usuário</small></div><button onClick={onLogout}><LogOut size={18}/></button></div></aside>
}

function Topbar({user}){ return <header className="topbar"><div className="top-date"><CalendarDays size={18}/> Setembro de 2026</div><Bell size={20}/><div className="avatar">{user.name[0]?.toUpperCase()}</div><b>{user.name}</b></header> }
function PageHead({title,subtitle,action}){ return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function Card({title,children}){ return <section className="card"><div className="card-title"><h3>{title}</h3></div>{children}</section> }

function List({rows=[]}){
  return <div className="list">{rows.length===0?<div className="empty">Nenhum lançamento.</div>:rows.map(r=><div className="list-row" key={`${r.type||''}-${r.id}-${r.desc}`}><div className={`mini-icon ${r.type==='in'?'income':'expense'}`}>{r.type==='in'?<TrendingUp size={18}/>:<ReceiptText size={18}/>}</div><div className="grow"><b>{r.desc}</b><small>{r.category || r.kind || 'Lançamento'} {r.by ? `• por ${r.by}` : ''}</small></div><strong className={r.type==='in'?'good':'bad'}>{r.type==='in'?'+ ':'- '}{money(r.amount)}</strong><ChevronRight size={17}/></div>)}</div>
}

function Dashboard({expenses,incomes}){
  const income = incomes.reduce((s,x)=>s+Number(x.amount),0), spent = expenses.reduce((s,x)=>s+Number(x.amount),0), balance = income-spent
  const byCat = Object.entries(expenses.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).map(([name,value])=>({name,value}))
  const monthly = [{m:'Abr',r:7800,d:6900},{m:'Mai',r:8200,d:7100},{m:'Jun',r:9000,d:7600},{m:'Jul',r:9200,d:7900},{m:'Ago',r:8500,d:7400},{m:'Set',r:income,d:spent}]
  return <><PageHead title="Olá!" subtitle="Acompanhe o resumo financeiro do mês."/><div className="stats-grid"><Stat icon={TrendingUp} label="Renda prevista" value={money(income)} tone="green" sub="Setembro"/><Stat icon={CheckCircle2} label="Renda recebida" value={money(income)} tone="green" sub="100% da meta"/><Stat icon={TrendingDown} label="Despesas pagas" value={money(spent)} tone="red" sub={`${Math.round((spent/income)*100 || 0)}% da renda`}/><Stat icon={Clock3} label="A pagar" value={money(0)} tone="orange" sub="Tudo em dia"/><Stat icon={Wallet} label="Saldo atual" value={money(balance)} tone="blue" sub="Saldo do mês"/><Stat icon={PiggyBank} label="Disponível para investir" value={money(Math.max(balance,0)*0.08)} tone="green" sub="Meta sugerida"/></div><div className="two-col"><Card title="Receitas x Despesas"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip formatter={v=>money(v)}/><Bar dataKey="r" fill="#14b87a" radius={[6,6,0,0]}/><Bar dataKey="d" fill="#1368ff" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card><Card title="Despesas por categoria"><div className="pie-wrap"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={1}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,6).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div></Card></div><div className="two-col"><Card title="Últimas movimentações"><List rows={[...incomes.map(x=>({...x,type:'in'})),...expenses.map(x=>({...x,type:'out'}))].slice(-6).reverse()}/></Card><Card title="Contas a vencer"><List rows={expenses.slice(0,5).map(x=>({...x,type:'out'}))}/></Card></div></>
}

function Receitas({incomes,onNew}){
  const total = incomes.reduce((s,x)=>s+Number(x.amount),0)
  return <><PageHead title="Receitas" subtitle="Controle de rendas e recebimentos." action={<button className="primary-btn compact" onClick={()=>onNew('receita')}><Plus size={18}/> Nova receita</button>}/><div className="stats-grid four"><Stat icon={PiggyBank} label="Renda prevista" value={money(total)} tone="green"/><Stat icon={CheckCircle2} label="Renda recebida" value={money(total)} tone="green"/><Stat icon={Plus} label="Renda extra" value={money(incomes.filter(x=>x.kind==='Extra').reduce((s,x)=>s+x.amount,0))}/><Stat icon={Clock3} label="Pendente" value={money(0)} tone="orange"/></div><div className="two-col split-wide"><Card title="Receitas recorrentes"><List rows={incomes.filter(x=>x.kind==='Recorrente').map(x=>({...x,type:'in'}))}/></Card><Card title="Receitas extras"><List rows={incomes.filter(x=>x.kind==='Extra').map(x=>({...x,type:'in'}))}/></Card></div></>
}

function Despesas({expenses,onNew}){
  const total = expenses.reduce((s,x)=>s+Number(x.amount),0), byCat=Object.entries(expenses.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).map(([name,value])=>({name,value}))
  return <><PageHead title="Despesas" subtitle="Controle e acompanhamento dos seus gastos." action={<button className="primary-btn compact" onClick={()=>onNew('despesa')}><Plus size={18}/> Nova despesa</button>}/><div className="stats-grid four"><Stat icon={CreditCard} label="Despesas pagas" value={money(total)} tone="red"/><Stat icon={Clock3} label="A pagar" value={money(0)} tone="orange"/><Stat icon={TrendingDown} label="Em atraso" value={money(0)} tone="red"/><Stat icon={Target} label="Orçamento do mês" value={money(9600)} tone="blue"/></div><div className="two-col split-wide"><Card title="Despesas do mês"><List rows={expenses.map(x=>({...x,type:'out'}))}/></Card><Card title="Despesas por categoria"><div className="pie-wrap vertical"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,8).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div></Card></div></>
}

function Cartoes({cards}){
  const totalLimit=cards.reduce((s,c)=>s+c.limit,0), used=cards.reduce((s,c)=>s+c.used,0)
  return <><PageHead title="Cartões" subtitle="Controle de cartões, compras e faturas."/><div className="stats-grid four"><Stat icon={CreditCard} label="Limite total" value={money(totalLimit)}/><Stat icon={Wallet} label="Disponível" value={money(totalLimit-used)} tone="green"/><Stat icon={ReceiptText} label="Fatura atual" value={money(used)} tone="red"/><Stat icon={CalendarDays} label="Próximo vencimento" value="20/09" tone="orange"/></div><Card title="Meus cartões"><div className="credit-cards">{cards.map((c,i)=><div className={`credit-card cc${i+1}`} key={c.id}><small>Carol & Marcos</small><h3>{c.name}</h3><div className="cc-number">•••• {1200+c.id*137}</div><div className="cc-bottom"><span>Limite<br/><b>{money(c.limit)}</b></span><span>Disponível<br/><b>{money(c.limit-c.used)}</b></span></div></div>)}</div></Card><div className="two-col"><Card title="Próximas faturas"><List rows={cards.map(c=>({id:c.id,desc:c.name,amount:c.used,category:`Vence ${c.due}`,type:'out'}))}/></Card><Card title="Parcelamentos ativos"><div className="empty">Cadastre compras parceladas pelo botão +.</div></Card></div></>
}

function Planejamento({expenses,incomes}){
  const income=incomes.reduce((s,x)=>s+x.amount,0), spent=expenses.reduce((s,x)=>s+x.amount,0), balance=income-spent
  const cats=Object.entries(expenses.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,6)
  return <><PageHead title="Planejamento" subtitle="Organize metas, orçamento e prioridades do mês."/><div className="stats-grid four"><Stat icon={Target} label="Meta de economia" value={money(500)} tone="green" sub="Meta mensal"/><Stat icon={PiggyBank} label="Disponível para investir" value={money(Math.max(balance,0))} tone="green"/><Stat icon={Wallet} label="Orçamento do mês" value={money(income)}/><Stat icon={BarChart3} label="Saldo projetado" value={money(balance)} tone="purple"/></div><div className="two-col split-wide"><Card title="Orçamento por categoria"><div className="budget-list">{cats.map(([name,value],i)=>{const cap=Math.max(value*1.2,500), pct=Math.min(100,Math.round(value/cap*100));return <div key={name}><div><b>{name}</b><span>{money(value)} / {money(cap)}</span></div><div className="progress"><i style={{width:pct+'%',background:COLORS[i%COLORS.length]}}/></div><em>{pct}%</em></div>})}</div></Card><Card title="Metas do mês"><div className="goal"><b>Reserva de emergência</b><span>{money(500)} de {money(1000)}</span><div className="progress"><i style={{width:'50%'}}/></div></div><div className="goal"><b>Investir</b><span>{money(Math.max(balance,0))} de {money(1500)}</span><div className="progress"><i style={{width:Math.min(100,Math.max(0,balance/1500*100))+'%'}}/></div></div><div className="goal"><b>Manter gastos abaixo da renda</b><span>{spent<=income?'Meta em dia':'Acima da renda'}</span><div className="progress"><i style={{width:Math.min(100,spent/income*100)+'%'}}/></div></div></Card></div></>
}

function Relatorios({expenses,incomes}){
  const income=incomes.reduce((s,x)=>s+x.amount,0), spent=expenses.reduce((s,x)=>s+x.amount,0), byCat=Object.entries(expenses.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).map(([name,value])=>({name,value})), monthly=[{m:'Abr',r:7800,d:6900},{m:'Mai',r:8200,d:7100},{m:'Jun',r:9000,d:7600},{m:'Jul',r:9200,d:7900},{m:'Ago',r:8500,d:7400},{m:'Set',r:income,d:spent}]
  return <><PageHead title="Relatórios" subtitle="Analise seus resultados e acompanhe sua evolução financeira."/><div className="stats-grid four"><Stat icon={TrendingUp} label="Receitas do mês" value={money(income)} tone="green"/><Stat icon={TrendingDown} label="Despesas do mês" value={money(spent)} tone="red"/><Stat icon={Wallet} label="Saldo líquido" value={money(income-spent)}/><Stat icon={PiggyBank} label="Investido no mês" value={money(Math.max(income-spent,0)*.08)} tone="purple"/></div><div className="two-col"><Card title="Receitas x Despesas"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip formatter={v=>money(v)}/><Bar dataKey="r" fill="#14b87a"/><Bar dataKey="d" fill="#1368ff"/></BarChart></ResponsiveContainer></div></Card><Card title="Despesas por categoria"><div className="pie-wrap"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,6).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div></Card></div></>
}

function Config({user,onLogout}){
  const users=getStore('cm_users',[])
  return <><PageHead title="Configurações" subtitle="Personalize o sistema, usuários e preferências."/><div className="two-col split-wide"><Card title="Usuários do sistema"><div className="list">{users.map(u=><div className="list-row" key={u.id}><div className="avatar">{u.name[0].toUpperCase()}</div><div className="grow"><b>{u.name}</b><small>Usuário cadastrado neste dispositivo</small></div><span className="pill">Ativo</span></div>)}</div></Card><Card title="Perfil da família"><div className="settings-text"><b>Carol & Marcos — Controle Financeiro</b><p>Controle financeiro da nossa família.</p><p>Usuário atual: <strong>{user.name}</strong></p></div></Card></div><div className="two-col split-wide"><Card title="Segurança e acesso"><div className="settings-text"><p>✓ Acesso com nome e PIN de 4 dígitos</p><p>✓ Sessão salva neste navegador</p><p className="warning">Nesta primeira versão os dados são salvos no próprio navegador. A sincronização online entre celular e computador será ativada na etapa do Supabase.</p></div></Card><Card title="Backup e exportação"><div className="settings-text"><p>Em breve: exportação CSV/Excel, backup online e restauração.</p><button className="secondary-btn" onClick={onLogout}><LogOut size={18}/> Sair da conta</button></div></Card></div></>
}

function NewTransactionModal({type,user,onClose,onSave}){
  const [form,setForm]=useState({desc:'',amount:'',category:type==='receita'?'Outras receitas':'Outros',kind:type==='receita'?'Extra':'Variável'})
  const save=()=>{if(!form.desc.trim()||!Number(form.amount))return;onSave({id:Date.now(),desc:form.desc.trim(),amount:Number(form.amount),category:form.category,kind:form.kind,status:type==='receita'?'Recebida':'Pago',date:new Date().toISOString().slice(0,10),by:user.name});onClose()}
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><h2>{type==='receita'?'Nova receita':'Nova despesa'}</h2><button onClick={onClose}><X/></button></div><label>Descrição</label><input value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder={type==='receita'?'Ex.: Venda de material':'Ex.: Supermercado'}/><label>Valor</label><input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value.replace(',','.')})} placeholder="0,00"/><label>Categoria</label><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><label>Tipo</label><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{type==='receita'?<><option>Recorrente</option><option>Extra</option></>:<><option>Fixa</option><option>Variável</option><option>Parcelada</option></>}</select><div className="modal-user">Lançado por <b>{user.name}</b></div><button className="primary-btn" onClick={save}><Save size={18}/> Salvar lançamento</button></div></div>
}

function BottomNav({page,setPage,onNew}){ return <nav className="bottom-nav"><button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}><Home/><span>Início</span></button><button className={page==='receitas'?'active':''} onClick={()=>setPage('receitas')}><BarChart3/><span>Receitas</span></button><button className="fab" onClick={()=>onNew('despesa')}><Plus/></button><button className={page==='despesas'?'active':''} onClick={()=>setPage('despesas')}><TrendingDown/><span>Despesas</span></button><button className={['cartoes','planejamento','relatorios','config'].includes(page)?'active':''} onClick={()=>setPage('config')}><Settings/><span>Mais</span></button></nav> }

function App(){
  const [user,setUser]=useState(()=>getStore('cm_session',null)), [page,setPage]=useState('dashboard'), [expenses,setExpenses]=useState(()=>getStore('cm_expenses',DEFAULT_EXPENSES)), [incomes,setIncomes]=useState(()=>getStore('cm_incomes',DEFAULT_INCOMES)), [cards]=useState(()=>getStore('cm_cards',DEFAULT_CARDS)), [modal,setModal]=useState(null)
  useEffect(()=>setStore('cm_expenses',expenses),[expenses]); useEffect(()=>setStore('cm_incomes',incomes),[incomes]); useEffect(()=>setStore('cm_cards',cards),[cards])
  const logout=()=>{localStorage.removeItem('cm_session');setUser(null)}
  if(!user) return <Auth onLogin={setUser}/>
  const saveTransaction=item=>{if(modal==='receita')setIncomes(v=>[item,...v]);else setExpenses(v=>[item,...v])}
  let content
  if(page==='dashboard') content=<Dashboard expenses={expenses} incomes={incomes}/>
  if(page==='receitas') content=<Receitas incomes={incomes} onNew={setModal}/>
  if(page==='despesas') content=<Despesas expenses={expenses} onNew={setModal}/>
  if(page==='cartoes') content=<Cartoes cards={cards}/>
  if(page==='planejamento') content=<Planejamento expenses={expenses} incomes={incomes}/>
  if(page==='relatorios') content=<Relatorios expenses={expenses} incomes={incomes}/>
  if(page==='config') content=<Config user={user} onLogout={logout}/>
  return <div className="app"><Sidebar page={page} setPage={setPage} user={user} onLogout={logout}/><main className="main"><Topbar user={user}/><div className="content">{content}</div></main><BottomNav page={page} setPage={setPage} onNew={setModal}/>{modal&&<NewTransactionModal type={modal} user={user} onClose={()=>setModal(null)} onSave={saveTransaction}/>}</div>
}

createRoot(document.getElementById('root')).render(<App/>)
