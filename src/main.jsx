import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Home, TrendingUp, TrendingDown, CreditCard, Target, BarChart3, Settings,
  Plus, Bell, LogOut, Wallet, PiggyBank, Clock3, ReceiptText, UserRound,
  CalendarDays, ChevronRight, X, Save, Eye, EyeOff, CheckCircle2, Pencil, Trash2, Download
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from 'recharts'
import './styles.css'
import { api } from './api'

const COLORS = ['#1368ff', '#7657ff', '#16b8a5', '#ff9f1c', '#ff5b65', '#91a4bd']

const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const localISODate = (date=new Date()) => {
  const y=date.getFullYear()
  const m=String(date.getMonth()+1).padStart(2,'0')
  const d=String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
const getStore = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback } }
const setStore = (key, value) => localStorage.setItem(key, JSON.stringify(value))

const KIND_PT = {
  recurring: 'Recorrente',
  extra: 'Extra',
  fixed: 'Fixa',
  variable: 'Variável',
  installment: 'Parcelada',
  card: 'Cartão',
  other: 'Outro',
}
const KIND_DB = {
  Recorrente: 'recurring',
  Extra: 'extra',
  Fixa: 'fixed',
  Variável: 'variable',
  Parcelada: 'installment',
  Cartão: 'card',
}
const STATUS_PT = {
  planned: 'Planejado',
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebida',
  overdue: 'Em atraso',
  cancelled: 'Cancelado',
}

function txToUi(tx, categoryMap, userMap){
  return {
    id: tx.id,
    desc: tx.description,
    amount: Number(tx.amount),
    category: categoryMap[tx.category_id]?.name || 'Sem categoria',
    categoryId: tx.category_id,
    cardId: tx.card_id,
    status: STATUS_PT[tx.status] || tx.status,
    statusKey: tx.status,
    kind: KIND_PT[tx.kind] || tx.kind,
    date: tx.transaction_date,
    dueDate: tx.due_date,
    paidDate: tx.paid_date,
    installmentGroup: tx.installment_group,
    installmentNumber: tx.installment_number,
    totalInstallments: tx.total_installments,
    isRecurring: tx.is_recurring,
    merchant: tx.merchant,
    source: tx.source,
    notes: tx.notes,
    createdAt: tx.created_at,
    by: userMap[tx.created_by] || 'Usuário',
    type: tx.type,
  }
}

function Auth({ onLogin }){
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setMsg('')
    const clean = name.trim()
    if (!clean) return setMsg('Digite seu nome.')
    if (!/^\d{4}$/.test(pin)) return setMsg('O PIN deve ter exatamente 4 números.')

    setBusy(true)
    try {
      let result
      if (mode === 'register') {
        result = await api.register(clean, pin, joinCode.trim() || null)
      } else {
        result = await api.login(clean, pin)
      }

      const row = Array.isArray(result) ? result[0] : result
      if (!row?.session_token) throw new Error('Não foi possível iniciar a sessão.')

      const validated = await api.validate(row.session_token)
      const profile = Array.isArray(validated) ? validated[0] : validated
      if (!profile?.user_id) throw new Error('Sessão inválida.')

      const user = {
        id: profile.user_id,
        name: profile.user_name,
        role: profile.user_role,
        householdId: profile.household_id,
        token: row.session_token,
      }

      if (row.join_code) {
        setStore('cm_join_code', row.join_code)
        setStore('cm_show_join_code', true)
      }

      setStore('cm_session', user)
      onLogin(user)
    } catch (err) {
      const text = String(err?.message || err)
      if (mode === 'register' && text.toLowerCase().includes('código da família')) {
        setMsg('Já existe uma família cadastrada. Para cadastrar Carol ou Marcos no mesmo sistema, informe o Código da Família.')
      } else {
        setMsg(text)
      }
    } finally {
      setBusy(false)
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
        <p>{mode === 'login' ? 'Acesse sua conta para continuar cuidando das suas finanças.' : 'Cadastre seu nome e um PIN de quatro dígitos.'}</p>

        <label>Nome</label>
        <div className="field"><UserRound size={20}/><input autoComplete="username" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Marcos"/></div>

        <label>PIN de 4 dígitos</label>
        <div className="field">
          <input autoComplete="current-password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} type={showPin ? 'text':'password'} placeholder="••••"/>
          <button className="icon-btn" type="button" onClick={()=>setShowPin(v=>!v)}>{showPin?<EyeOff size={18}/>:<Eye size={18}/>}</button>
        </div>

        {mode === 'register' && <>
          <label>Código da Família <small className="label-help">(somente para o segundo usuário)</small></label>
          <div className="field"><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={8} placeholder="Deixe vazio no primeiro cadastro"/></div>
        </>}

        {msg && <div className="auth-msg">{msg}</div>}
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Cadastrar e entrar')}</button>
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
  return <aside className="sidebar"><div className="sidebar-brand"><BarChart3/><div><b>Carol <span>&</span> Marcos</b><small>CONTROLE FINANCEIRO</small></div></div><nav>{items.map(([k,l,I])=><button key={k} title={l} aria-label={l} className={page===k?'active':''} onClick={()=>setPage(k)}><I size={20}/><span>{l}</span></button>)}</nav><div className="sidebar-foot"><div className="user-dot">{user.name[0]?.toUpperCase()}</div><div className="sidebar-user-info"><b>{user.name}</b><small>Usuário</small></div><button title="Sair" aria-label="Sair" onClick={onLogout}><LogOut size={18}/></button></div></aside>
}

function Topbar({user}){
  const raw=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date())
  const label=raw.charAt(0).toUpperCase()+raw.slice(1)
  return <header className="topbar"><div className="top-date"><CalendarDays size={18}/> {label}</div><Bell size={20}/><div className="avatar">{user.name[0]?.toUpperCase()}</div><b>{user.name}</b></header>
}
function PageHead({title,subtitle,action}){ return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function Card({title,children,action}){ return <section className="card"><div className="card-title"><h3>{title}</h3>{action}</div>{children}</section> }

function effectiveDate(item){
  return item?.type==='expense' ? (item.dueDate || item.date || '') : (item?.date || item?.dueDate || '')
}

function isCurrentMonth(item){
  const raw=effectiveDate(item)
  if(!raw) return false
  const date=new Date(raw+'T12:00:00')
  const now=new Date()
  return date.getFullYear()===now.getFullYear() && date.getMonth()===now.getMonth()
}

function currentMonthLabel(){
  const raw=new Intl.DateTimeFormat('pt-BR',{month:'long'}).format(new Date())
  return raw.charAt(0).toUpperCase()+raw.slice(1)
}

function getDisplayStatus(item){
  if (item.type === 'expense' && item.statusKey === 'pending' && item.dueDate) {
    const today = localISODate()
    if (item.dueDate < today) return 'Em atraso'
  }
  return item.status || 'Pendente'
}

function StatusBadge({item}){
  const label = getDisplayStatus(item)
  const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-')
  return <span className={`status-badge status-${key}`}>{label}</span>
}

function TransactionList({rows=[],onEdit,onDelete,onToggle,onView}){
  return <div className="list">{rows.length===0?<div className="empty">Nenhum lançamento.</div>:rows.map(r=><div className="list-row transaction-row" key={`${r.type||''}-${r.id}-${r.desc}`}>
    <div className={`mini-icon ${r.type==='income'||r.type==='in'?'income':'expense'}`}>{r.type==='income'||r.type==='in'?<TrendingUp size={18}/>:<ReceiptText size={18}/>}</div>
    <div className="grow"><b>{r.desc}</b><small>{r.category || r.kind || 'Lançamento'} {r.by ? `• por ${r.by}` : ''}{r.dueDate ? ` • vence ${new Date(r.dueDate+'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</small></div>
    {r.statusKey && <StatusBadge item={r}/>}
    <strong className={r.type==='income'||r.type==='in'?'good':'bad'}>{r.type==='income'||r.type==='in'?'+ ':'- '}{money(r.amount)}</strong>
    {(onView||onEdit||onDelete||onToggle) && <div className="row-actions">
      {onView && <button title="Visualizar lançamento" aria-label="Visualizar lançamento" onClick={()=>onView(r)}><Eye size={17}/></button>}
      {onToggle && <button title="Alterar situação" onClick={()=>onToggle(r)}><CheckCircle2 size={17}/></button>}
      {onEdit && <button title="Editar" onClick={()=>onEdit(r)}><Pencil size={17}/></button>}
      {onDelete && <button className="danger-action" title="Excluir" onClick={()=>onDelete(r)}><Trash2 size={17}/></button>}
    </div>}
  </div>)}</div>
}

function List({rows=[],onView}){ return <TransactionList rows={rows} onView={onView}/> }

function Dashboard({expenses,incomes,onView}){
  const monthExpenses=expenses.filter(item=>isCurrentMonth(item) && item.statusKey!=='cancelled')
  const monthIncomes=incomes.filter(item=>isCurrentMonth(item) && item.statusKey!=='cancelled')
  const income=monthIncomes.reduce((s,x)=>s+Number(x.amount||0),0)
  const received=monthIncomes.filter(x=>x.statusKey==='received').reduce((s,x)=>s+Number(x.amount||0),0)
  const spent=monthExpenses.filter(x=>x.statusKey==='paid').reduce((s,x)=>s+Number(x.amount||0),0)
  const pending=monthExpenses.filter(x=>x.statusKey!=='paid').reduce((s,x)=>s+Number(x.amount||0),0)
  const balance=received-spent
  const savingsRate=received>0 ? balance/received*100 : 0

  const byCat=Object.entries(monthExpenses.reduce((a,x)=>{
    a[x.category]=(a[x.category]||0)+Number(x.amount||0)
    return a
  },{})).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  const now=new Date()
  const monthly=Array.from({length:6},(_,index)=>{
    const date=new Date(now.getFullYear(),now.getMonth()-(5-index),1,12,0,0)
    const year=date.getFullYear()
    const month=date.getMonth()
    const r=incomes.filter(item=>{
      const raw=effectiveDate(item); if(!raw || item.statusKey==='cancelled') return false
      const d=new Date(raw+'T12:00:00')
      return d.getFullYear()===year && d.getMonth()===month
    }).reduce((sum,item)=>sum+Number(item.amount||0),0)
    const d=expenses.filter(item=>{
      const raw=effectiveDate(item); if(!raw || item.statusKey==='cancelled') return false
      const dt=new Date(raw+'T12:00:00')
      return dt.getFullYear()===year && dt.getMonth()===month
    }).reduce((sum,item)=>sum+Number(item.amount||0),0)
    return {m:date.toLocaleDateString('pt-BR',{month:'short'}),r,d}
  })

  const latest=[...incomes.map(x=>({...x,type:'in'})),...expenses.map(x=>({...x,type:'out'}))]
    .filter(item=>item.statusKey!=='cancelled' && effectiveDate(item))
    .sort((a,b)=>effectiveDate(b).localeCompare(effectiveDate(a)))
    .slice(0,6)

  const today=localISODate()
  const upcoming=expenses
    .filter(item=>item.statusKey!=='paid' && item.statusKey!=='cancelled' && item.dueDate && item.dueDate>=today)
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
    .slice(0,5)
    .map(x=>({...x,type:'out'}))

  return <><PageHead title="Olá!" subtitle="Acompanhe o resumo financeiro do mês."/>
    <div className="stats-grid">
      <Stat icon={TrendingUp} label="Renda prevista" value={money(income)} tone="green" sub={currentMonthLabel()}/>
      <Stat icon={CheckCircle2} label="Renda recebida" value={money(received)} tone="green" sub={`${Math.round((received/Math.max(income,1))*100 || 0)}% da prevista`}/>
      <Stat icon={TrendingDown} label="Despesas pagas" value={money(spent)} tone="red" sub={`${Math.round((spent/Math.max(received,1))*100 || 0)}% do recebido`}/>
      <Stat icon={Clock3} label="A pagar" value={money(pending)} tone="orange" sub={pending ? 'Contas pendentes no mês' : 'Tudo em dia'}/>
      <Stat icon={Wallet} label="Saldo atual" value={money(balance)} tone={balance>=0?'blue':'red'} sub="Recebido - pago"/>
      <Stat icon={PiggyBank} label="Taxa de economia" value={`${savingsRate.toFixed(1).replace('.',',')}%`} tone={savingsRate>=0?'green':'red'} sub="Saldo ÷ renda recebida"/>
    </div>
    <div className="two-col">
      <Card title="Receitas x Despesas"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip formatter={v=>money(v)}/><Bar name="Receitas" dataKey="r" fill="#14b87a" radius={[6,6,0,0]}/><Bar name="Despesas" dataKey="d" fill="#1368ff" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>
      <Card title="Despesas por categoria">{byCat.length ? <div className="pie-wrap"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={1}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,6).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div> : <div className="empty">Sem despesas neste mês.</div>}</Card>
    </div>
    <div className="two-col">
      <Card title="Últimas movimentações"><List rows={latest} onView={onView}/></Card>
      <Card title="Próximas contas a vencer"><List rows={upcoming}/></Card>
    </div>
  </>
}

function Receitas({incomes,onNew,onEdit,onDelete,onToggle}){
  const rows=incomes.filter(item=>isCurrentMonth(item) && item.statusKey!=='cancelled')
  const total=rows.reduce((s,x)=>s+Number(x.amount||0),0)
  const received=rows.filter(x=>x.statusKey==='received').reduce((s,x)=>s+Number(x.amount||0),0)
  const pending=rows.filter(x=>x.statusKey!=='received').reduce((s,x)=>s+Number(x.amount||0),0)
  const extra=rows.filter(x=>x.kind==='Extra').reduce((s,x)=>s+Number(x.amount||0),0)
  return <><PageHead title="Receitas" subtitle={`Controle de rendas e recebimentos de ${currentMonthLabel()}.`} action={<button className="primary-btn compact" onClick={()=>onNew('receita')}><Plus size={18}/> Nova receita</button>}/>
    <div className="stats-grid four"><Stat icon={PiggyBank} label="Renda prevista" value={money(total)} tone="green"/><Stat icon={CheckCircle2} label="Renda recebida" value={money(received)} tone="green"/><Stat icon={Plus} label="Renda extra" value={money(extra)}/><Stat icon={Clock3} label="Pendente" value={money(pending)} tone="orange"/></div>
    <div className="two-col split-wide"><Card title="Receitas recorrentes"><TransactionList rows={rows.filter(x=>x.kind==='Recorrente')} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card><Card title="Receitas extras"><TransactionList rows={rows.filter(x=>x.kind==='Extra')} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card></div>
  </>
}

function Despesas({expenses,onNew,onReceipt,onEdit,onDelete,onToggle}){
  const rows=expenses.filter(item=>isCurrentMonth(item) && item.statusKey!=='cancelled')
  const paid=rows.filter(x=>x.statusKey==='paid').reduce((s,x)=>s+Number(x.amount||0),0)
  const pendingRows=rows.filter(x=>x.statusKey!=='paid')
  const pending=pendingRows.filter(x=>getDisplayStatus(x)!=='Em atraso').reduce((s,x)=>s+Number(x.amount||0),0)
  const overdue=pendingRows.filter(x=>getDisplayStatus(x)==='Em atraso').reduce((s,x)=>s+Number(x.amount||0),0)
  const total=rows.reduce((s,x)=>s+Number(x.amount||0),0)
  const byCat=Object.entries(rows.reduce((a,x)=>{
    a[x.category]=(a[x.category]||0)+Number(x.amount||0)
    return a
  },{})).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  return <><PageHead title="Despesas" subtitle={`Controle e acompanhamento dos gastos de ${currentMonthLabel()}.`} action={<div className="page-actions"><button className="secondary-btn compact" onClick={onReceipt}><ReceiptText size={18}/> Ler cupom</button><button className="primary-btn compact" onClick={()=>onNew('despesa')}><Plus size={18}/> Nova despesa</button></div>}/>
    <div className="stats-grid four"><Stat icon={CreditCard} label="Despesas pagas" value={money(paid)} tone="red"/><Stat icon={Clock3} label="A pagar" value={money(pending)} tone="orange"/><Stat icon={TrendingDown} label="Em atraso" value={money(overdue)} tone="red"/><Stat icon={Target} label="Total previsto" value={money(total)} tone="blue"/></div>
    <div className="two-col split-wide"><Card title="Despesas do mês"><TransactionList rows={rows} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card><Card title="Despesas por categoria">{byCat.length ? <div className="pie-wrap vertical"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,8).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div> : <div className="empty">Sem despesas neste mês.</div>}</Card></div>
  </>
}

function safeDateWithDay(year,monthIndex,day){
  const lastDay=new Date(year,monthIndex+1,0).getDate()
  const finalDay=Math.min(Math.max(1,Number(day||1)),lastDay)
  const date=new Date(year,monthIndex,finalDay,12,0,0)
  const y=date.getFullYear()
  const m=String(date.getMonth()+1).padStart(2,'0')
  const d=String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}

function cardFirstDueDate(purchaseDate,closingDay,dueDay){
  const base=new Date((purchaseDate||localISODate())+'T12:00:00')
  const closeDay=Number(closingDay||1)
  const payDay=Number(dueDay||1)
  let closeMonth=base.getMonth()
  let closeYear=base.getFullYear()
  if(base.getDate()>closeDay){
    closeMonth+=1
    if(closeMonth>11){closeMonth=0;closeYear+=1}
  }
  const closeIso=safeDateWithDay(closeYear,closeMonth,closeDay)
  const closeDate=new Date(closeIso+'T12:00:00')
  let dueMonth=closeDate.getMonth()
  let dueYear=closeDate.getFullYear()
  let dueIso=safeDateWithDay(dueYear,dueMonth,payDay)
  if(new Date(dueIso+'T12:00:00')<=closeDate){
    dueMonth+=1
    if(dueMonth>11){dueMonth=0;dueYear+=1}
    dueIso=safeDateWithDay(dueYear,dueMonth,payDay)
  }
  return dueIso
}

function buildCardInvoices(cards,expenses){
  const cardMap=Object.fromEntries(cards.map(card=>[card.id,card]))
  const groups={}
  expenses.filter(item=>item.cardId && item.dueDate && item.statusKey!=='cancelled').forEach(item=>{
    const key=`${item.cardId}|${item.dueDate}`
    if(!groups[key]){
      groups[key]={
        id:key,
        cardId:item.cardId,
        cardName:cardMap[item.cardId]?.name || 'Cartão',
        dueDate:item.dueDate,
        amount:0,
        paidAmount:0,
        items:[],
      }
    }
    groups[key].amount+=Number(item.amount||0)
    if(item.statusKey==='paid') groups[key].paidAmount+=Number(item.amount||0)
    groups[key].items.push(item)
  })
  return Object.values(groups).map(group=>({
    ...group,
    openAmount:Math.max(0,Number(group.amount||0)-Number(group.paidAmount||0)),
    paid:group.items.length>0 && group.items.every(item=>item.statusKey==='paid'),
  })).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
}

const CARD_COLOR_OPTIONS = [
  {name:'Azul',value:'#175CD3'},
  {name:'Roxo',value:'#6D28D9'},
  {name:'Verde',value:'#087F5B'},
  {name:'Preto',value:'#111827'},
  {name:'Grafite',value:'#334155'},
  {name:'Vermelho',value:'#B42318'},
  {name:'Laranja',value:'#C2410C'},
  {name:'Rosa',value:'#BE185D'},
]

const CARD_BRANDS = [
  {value:'mastercard',label:'Mastercard'},
  {value:'visa',label:'Visa'},
  {value:'elo',label:'Elo'},
  {value:'nubank',label:'Nubank'},
  {value:'inter',label:'Inter'},
  {value:'picpay',label:'PicPay'},
  {value:'caixa',label:'CAIXA'},
  {value:'amex',label:'American Express'},
  {value:'outro',label:'Outro'},
]

function cardTextColor(hex='#175CD3'){
  const normalized=String(hex||'').replace('#','')
  if(!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#ffffff'
  const r=parseInt(normalized.slice(0,2),16)
  const g=parseInt(normalized.slice(2,4),16)
  const b=parseInt(normalized.slice(4,6),16)
  const luminance=(0.299*r+0.587*g+0.114*b)/255
  return luminance>.68 ? '#172554' : '#ffffff'
}

function CardBrandMark({brand='outro'}){
  const key=String(brand||'outro').toLowerCase()
  if(key==='mastercard') return <div className="card-brand-logo mastercard-mark" title="Mastercard"><i/><i/></div>
  if(key==='visa') return <div className="card-brand-logo brand-word visa-mark">VISA</div>
  if(key==='elo') return <div className="card-brand-logo brand-word elo-mark">elo</div>
  if(key==='nubank') return <div className="card-brand-logo brand-word nu-mark">nu</div>
  if(key==='inter') return <div className="card-brand-logo brand-word inter-mark">inter</div>
  if(key==='picpay') return <div className="card-brand-logo brand-word picpay-mark">PicPay</div>
  if(key==='caixa') return <div className="card-brand-logo brand-word caixa-mark">CAIXA</div>
  if(key==='amex') return <div className="card-brand-logo brand-word amex-mark">AMEX</div>
  return <div className="card-brand-logo generic-mark"><CreditCard size={22}/></div>
}
function Cartoes({cards,expenses,onNew,onPurchase,onPayInvoice,onDeletePurchase}){
  const invoices=buildCardInvoices(cards,expenses)
  const totalLimit=cards.reduce((sum,card)=>sum+Number(card.limit||0),0)
  const used=cards.reduce((sum,card)=>sum+Number(card.used||0),0)
  const unpaidInvoices=invoices.filter(invoice=>!invoice.paid)
  const byCardCurrent=cards.map(card=>unpaidInvoices.find(invoice=>invoice.cardId===card.id)).filter(Boolean)
  const currentInvoice=byCardCurrent.reduce((sum,invoice)=>sum+Number(invoice.openAmount||0),0)
  const nextInvoice=unpaidInvoices[0]
  const installmentGroups=Object.values(
    expenses.filter(item=>item.cardId && item.installmentGroup && Number(item.totalInstallments)>1 && item.statusKey!=='cancelled').reduce((acc,item)=>{
      const key=item.installmentGroup
      if(!acc[key]) acc[key]={id:key,description:item.desc.replace(/\s+\d+\/\d+$/,''),cardId:item.cardId,total:item.totalInstallments,paid:0,amount:0,nextDue:null}
      acc[key].amount+=Number(item.amount||0)
      if(item.statusKey==='paid') acc[key].paid+=1
      if(item.statusKey!=='paid' && (!acc[key].nextDue || item.dueDate<acc[key].nextDue)) acc[key].nextDue=item.dueDate
      return acc
    },{})
  )
  const cardName=id=>cards.find(card=>card.id===id)?.name || 'Cartão'
  const cardPurchases=Object.values(
    expenses.filter(item=>item.cardId && item.source==='card' && item.statusKey!=='cancelled').reduce((acc,item)=>{
      const key=item.installmentGroup || `single-${item.id}`
      if(!acc[key]){
        acc[key]={
          id:key,
          installmentGroup:item.installmentGroup || null,
          description:item.installmentGroup ? item.desc.replace(/\s+\d+\/\d+$/,'') : item.desc,
          cardId:item.cardId,
          amount:0,
          installments:Number(item.totalInstallments||1),
          paid:0,
          firstDue:item.dueDate || item.date,
          itemId:item.installmentGroup ? null : item.id,
        }
      }
      acc[key].amount+=Number(item.amount||0)
      if(item.statusKey==='paid') acc[key].paid+=1
      if(item.dueDate && (!acc[key].firstDue || item.dueDate<acc[key].firstDue)) acc[key].firstDue=item.dueDate
      return acc
    },{})
  ).sort((a,b)=>(b.firstDue||'').localeCompare(a.firstDue||''))

  return <><PageHead title="Cartões" subtitle="Controle de cartões, compras e faturas." action={<div className="page-actions"><button className="secondary-btn compact" onClick={onPurchase} disabled={!cards.length}><CreditCard size={18}/> Nova compra</button><button className="primary-btn compact" onClick={onNew}><Plus size={18}/> Novo cartão</button></div>}/>
    <div className="stats-grid four">
      <Stat icon={CreditCard} label="Limite total" value={money(totalLimit)}/>
      <Stat icon={Wallet} label="Limite disponível" value={money(Math.max(totalLimit-used,0))} tone="green"/>
      <Stat icon={ReceiptText} label="Faturas em aberto" value={money(currentInvoice)} tone="red"/>
      <Stat icon={CalendarDays} label="Próximo vencimento" value={nextInvoice ? new Date(nextInvoice.dueDate+'T12:00:00').toLocaleDateString('pt-BR') : '—'} tone="orange"/>
    </div>

    <Card title="Meus cartões">
      {cards.length ? <div className="credit-cards">{cards.map((card,i)=>{
        const invoice=unpaidInvoices.find(item=>item.cardId===card.id)
        const cardColor=card.color || CARD_COLOR_OPTIONS[i%CARD_COLOR_OPTIONS.length].value
        const textColor=cardTextColor(cardColor)
        return <div className="credit-card" key={card.id} style={{'--card-color':cardColor,color:textColor}}>
          <div className="cc-top"><small>{card.holderName ? `Titular • ${card.holderName}` : 'Titular não definido'}</small><CardBrandMark brand={card.brand}/></div>
          <h3>{card.name}</h3>
          <div className="cc-number">•••• {card.last4 || '0000'}</div>
          <div className="cc-cycle">Fecha dia <b>{card.closingDay || '—'}</b> • Vence dia <b>{card.dueDay || '—'}</b></div>
          <div className="cc-bottom"><span>Disponível<br/><b>{money(Math.max(card.limit-card.used,0))}</b></span><span>Próxima fatura<br/><b>{money(invoice?.openAmount||0)}</b></span></div>
        </div>
      })}</div> : <div className="empty">Nenhum cartão cadastrado. Clique em “Novo cartão”.</div>}
    </Card>

    <Card title="Compras lançadas no cartão">
      <div className="card-purchase-list">
        {cardPurchases.length===0 ? <div className="empty">Nenhuma compra lançada no cartão.</div> : cardPurchases.map(purchase=><div className="card-purchase-row" key={purchase.id}>
          <div className="mini-icon expense"><CreditCard size={18}/></div>
          <div className="grow"><b>{purchase.description}</b><small>{cardName(purchase.cardId)} • {purchase.installments>1 ? `${purchase.installments} parcelas` : 'à vista'}{purchase.firstDue ? ` • 1º venc. ${new Date(purchase.firstDue+'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</small></div>
          <strong>{money(purchase.amount)}</strong>
          <span className="status-badge status-pendente">{purchase.installments>1 ? `${purchase.paid}/${purchase.installments} pagas` : (purchase.paid?'Paga':'Aberta')}</span>
          <button className="icon-square danger-action" onClick={()=>onDeletePurchase(purchase)} title="Apagar compra"><Trash2 size={17}/></button>
        </div>)}
      </div>
    </Card>

    <div className="two-col split-wide">
      <Card title="Faturas">
        <div className="invoice-list">
          {invoices.length===0 ? <div className="empty">As faturas aparecerão aqui quando você lançar compras no cartão.</div> : invoices.slice(0,12).map(invoice=><div className="invoice-row" key={invoice.id}>
            <div className="invoice-date"><span>{new Date(invoice.dueDate+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'})}</span><b>{new Date(invoice.dueDate+'T12:00:00').getDate()}</b></div>
            <div className="grow"><b>{invoice.cardName}</b><small>{invoice.items.length} lançamento(s) • vence {new Date(invoice.dueDate+'T12:00:00').toLocaleDateString('pt-BR')}</small></div>
            <strong>{money(invoice.amount)}</strong>
            <span className={`status-badge ${invoice.paid?'status-pago':(invoice.dueDate<localISODate()?'status-em-atraso':'status-pendente')}`}>{invoice.paid?'Paga':(invoice.dueDate<localISODate()?'Em atraso':'Aberta')}</span>
            {!invoice.paid && <button className="secondary-btn compact invoice-pay" onClick={()=>onPayInvoice(invoice)}>Marcar paga</button>}
          </div>)}
        </div>
      </Card>

      <Card title="Parcelamentos ativos">
        <div className="installment-list">
          {installmentGroups.length===0 ? <div className="empty">Nenhuma compra parcelada ativa.</div> : installmentGroups.slice(0,10).map(group=><div className="installment-card" key={group.id}>
            <div><b>{group.description}</b><small>{cardName(group.cardId)}</small></div>
            <strong>{group.paid}/{group.total}</strong>
            <div className="progress"><i style={{width:`${Math.min(100,(group.paid/group.total)*100)}%`}}/></div>
            <small>{group.nextDue ? `Próxima: ${new Date(group.nextDue+'T12:00:00').toLocaleDateString('pt-BR')}` : 'Parcelamento quitado'} • Total {money(group.amount)}</small>
          </div>)}
        </div>
      </Card>
    </div>
  </>
}

function Planejamento({expenses,incomes,categories,budgets,goals,onBudget,onBudgetDelete,onGoal,onGoalProgress,onGoalDelete}){
  const today=new Date()
  const year=today.getFullYear()
  const month=today.getMonth()+1
  const monthExpenses=expenses.filter(item=>{
    const date=item.dueDate || item.date
    if(!date) return false
    const d=new Date(date+'T12:00:00')
    return d.getFullYear()===year && d.getMonth()+1===month && item.statusKey!=='cancelled'
  })
  const monthIncomes=incomes.filter(item=>{
    const date=item.date
    if(!date) return false
    const d=new Date(date+'T12:00:00')
    return d.getFullYear()===year && d.getMonth()+1===month && item.statusKey!=='cancelled'
  })
  const income=monthIncomes.reduce((s,x)=>s+Number(x.amount||0),0)
  const spent=monthExpenses.reduce((s,x)=>s+Number(x.amount||0),0)
  const plannedTotal=budgets.reduce((s,x)=>s+Number(x.plannedAmount||0),0)
  const balance=income-spent
  const activeGoals=goals.filter(goal=>goal.status!=='completed')
  const targetGoals=activeGoals.reduce((s,g)=>s+Number(g.targetAmount||0),0)
  const currentGoals=activeGoals.reduce((s,g)=>s+Number(g.currentAmount||0),0)
  const categorySpent=monthExpenses.reduce((acc,item)=>{
    acc[item.categoryId]=(acc[item.categoryId]||0)+Number(item.amount||0)
    return acc
  },{})
  const categoryMap=Object.fromEntries(categories.map(cat=>[cat.id,cat]))
  const budgetRows=budgets.map((budget,index)=>{
    const spentValue=Number(categorySpent[budget.categoryId]||0)
    const planned=Number(budget.plannedAmount||0)
    const pct=planned>0 ? Math.min(999,Math.round(spentValue/planned*100)) : 0
    return {...budget,name:categoryMap[budget.categoryId]?.name || 'Categoria',spent:spentValue,pct,color:COLORS[index%COLORS.length]}
  }).sort((a,b)=>b.plannedAmount-a.plannedAmount)

  return <>
    <PageHead title="Planejamento" subtitle="Defina limites por categoria e acompanhe suas metas." action={<div className="page-actions"><button className="secondary-btn compact" onClick={onGoal}><Target size={18}/> Nova meta</button><button className="primary-btn compact" onClick={onBudget}><Plus size={18}/> Definir orçamento</button></div>}/>

    <div className="stats-grid four">
      <Stat icon={Wallet} label="Orçamento planejado" value={money(plannedTotal)} tone="blue" sub="Categorias do mês"/>
      <Stat icon={TrendingDown} label="Gasto realizado" value={money(spent)} tone="red" sub={plannedTotal ? `${Math.round(spent/plannedTotal*100)}% do orçamento` : 'Sem orçamento definido'}/>
      <Stat icon={PiggyBank} label="Saldo projetado" value={money(balance)} tone={balance>=0?'green':'red'} sub="Receitas - despesas"/>
      <Stat icon={Target} label="Metas em andamento" value={`${activeGoals.length}`} tone="purple" sub={targetGoals? `${money(currentGoals)} de ${money(targetGoals)}`:'Nenhuma meta ativa'}/>
    </div>

    <div className="two-col split-wide">
      <Card title="Orçamento por categoria">
        {budgetRows.length===0 ? <div className="empty">Nenhum orçamento definido para este mês. Clique em “Definir orçamento”.</div> :
        <div className="budget-list planning-budget-list">{budgetRows.map(row=><div key={row.id} className={row.pct>100?'budget-over':''}>
          <div><b>{row.name}</b><span>{money(row.spent)} de {money(row.plannedAmount)}</span></div>
          <div className="progress"><i style={{width:Math.min(100,row.pct)+'%',background:row.pct>100?'#ef4444':row.color}}/></div>
          <em>{row.pct}%</em>
          <button className="budget-edit" onClick={()=>onBudget(row)} title="Editar orçamento"><Pencil size={15}/></button>
          <button className="budget-edit danger-action" onClick={()=>onBudgetDelete(row)} title="Apagar orçamento"><Trash2 size={15}/></button>
        </div>)}</div>}
      </Card>

      <Card title="Resumo do mês">
        <div className="planning-summary">
          <div><span>Receitas previstas</span><b>{money(income)}</b></div>
          <div><span>Despesas previstas</span><b>{money(spent)}</b></div>
          <div><span>Orçamento disponível</span><b>{money(Math.max(plannedTotal-spent,0))}</b></div>
          <div className={balance>=0?'summary-positive':'summary-negative'}><span>Saldo projetado</span><strong>{money(balance)}</strong></div>
        </div>
      </Card>
    </div>

    <Card title="Metas financeiras">
      {goals.length===0 ? <div className="empty">Nenhuma meta cadastrada. Crie metas como reserva de emergência, viagem ou compra de um bem.</div> :
      <div className="goals-grid">{goals.map(goal=>{
        const target=Number(goal.targetAmount||0)
        const current=Number(goal.currentAmount||0)
        const pct=target>0?Math.min(100,Math.round(current/target*100)):0
        return <div className={`goal-card ${goal.status==='completed'?'goal-completed':''}`} key={goal.id}>
          <div className="goal-card-head"><div><b>{goal.title}</b><small>{goal.dueDate ? `Prazo: ${new Date(goal.dueDate+'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}</small></div><span className={`priority priority-${goal.priority}`}>{goal.priority==='high'?'Alta':goal.priority==='low'?'Baixa':'Média'}</span></div>
          <div className="goal-values"><strong>{money(current)}</strong><span>de {money(target)}</span></div>
          <div className="progress"><i style={{width:pct+'%'}}/></div>
          <div className="goal-card-foot"><span>{pct}% concluído</span><div><button onClick={()=>onGoalProgress(goal)} title="Atualizar valor"><Pencil size={16}/></button><button className="danger-action" onClick={()=>onGoalDelete(goal)} title="Excluir meta"><Trash2 size={16}/></button></div></div>
        </div>
      })}</div>}
    </Card>
  </>
}

function Relatorios({expenses,incomes}){
  const [period,setPeriod]=useState('6m')
  const [person,setPerson]=useState('todos')

  const today=new Date()
  const startOfMonth=new Date(today.getFullYear(),today.getMonth(),1,12,0,0)
  const startOfYear=new Date(today.getFullYear(),0,1,12,0,0)
  const startOf6Months=new Date(today.getFullYear(),today.getMonth()-5,1,12,0,0)
  const periodStart=period==='mes'?startOfMonth:period==='ano'?startOfYear:startOf6Months

  const filterByPeriod=item=>{
    const raw=item.date || item.dueDate
    if(!raw) return false
    const date=new Date(raw+'T12:00:00')
    if(date<periodStart || date>today) return false
    if(item.statusKey==='cancelled') return false
    if(person!=='todos' && item.by!==person) return false
    return true
  }

  const filteredIncomes=incomes.filter(filterByPeriod)
  const filteredExpenses=expenses.filter(filterByPeriod)
  const income=filteredIncomes.reduce((sum,item)=>sum+Number(item.amount||0),0)
  const spent=filteredExpenses.reduce((sum,item)=>sum+Number(item.amount||0),0)
  const received=filteredIncomes.filter(item=>item.statusKey==='received').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const paid=filteredExpenses.filter(item=>item.statusKey==='paid').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const pending=filteredExpenses.filter(item=>item.statusKey!=='paid').reduce((sum,item)=>sum+Number(item.amount||0),0)
  const balance=income-spent
  const savingsRate=income>0 ? balance/income*100 : 0

  const byCat=Object.entries(filteredExpenses.reduce((acc,item)=>{
    acc[item.category]=(acc[item.category]||0)+Number(item.amount||0)
    return acc
  },{})).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  const monthMap={}
  ;[...filteredIncomes.map(item=>({...item,_kind:'income'})),...filteredExpenses.map(item=>({...item,_kind:'expense'}))].forEach(item=>{
    const raw=item.date || item.dueDate
    const date=new Date(raw+'T12:00:00')
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
    if(!monthMap[key]) monthMap[key]={key,m:date.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),r:0,d:0}
    if(item._kind==='income') monthMap[key].r+=Number(item.amount||0)
    else monthMap[key].d+=Number(item.amount||0)
  })
  const monthly=Object.values(monthMap).sort((a,b)=>a.key.localeCompare(b.key))

  const byPerson=Object.entries([...filteredIncomes,...filteredExpenses].reduce((acc,item)=>{
    const name=item.by || 'Não identificado'
    acc[name]=(acc[name]||0)+1
    return acc
  },{})).sort((a,b)=>b[1]-a[1])

  const byKind=Object.entries(filteredExpenses.reduce((acc,item)=>{
    acc[item.kind || 'Outro']=(acc[item.kind || 'Outro']||0)+Number(item.amount||0)
    return acc
  },{})).sort((a,b)=>b[1]-a[1])

  const people=[...new Set([...incomes,...expenses].map(item=>item.by).filter(Boolean))]

  const exportCsv=()=>{
    const rows=[
      ['Tipo','Data','Descrição','Categoria','Situação','Valor','Usuário'],
      ...filteredIncomes.map(item=>['Receita',item.date||'',item.desc,item.category||'',item.status||'',Number(item.amount||0).toFixed(2).replace('.',','),item.by||'']),
      ...filteredExpenses.map(item=>['Despesa',item.date||item.dueDate||'',item.desc,item.category||'',getDisplayStatus(item),Number(item.amount||0).toFixed(2).replace('.',','),item.by||'']),
    ]
    const escape=value=>`"${String(value??'').replace(/"/g,'""')}"`
    const csv='\ufeff'+rows.map(row=>row.map(escape).join(';')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url
    link.download=`relatorio-financeiro-${localISODate()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return <>
    <PageHead title="Relatórios" subtitle="Analise seus resultados e acompanhe sua evolução financeira." action={<button className="primary-btn compact" onClick={exportCsv}><Download size={18}/> Exportar CSV</button>}/>

    <div className="report-filters">
      <div><label>Período</label><select value={period} onChange={event=>setPeriod(event.target.value)}><option value="mes">Este mês</option><option value="6m">Últimos 6 meses</option><option value="ano">Este ano</option></select></div>
      <div><label>Usuário</label><select value={person} onChange={event=>setPerson(event.target.value)}><option value="todos">Carol e Marcos</option>{people.map(name=><option key={name} value={name}>{name}</option>)}</select></div>
    </div>

    <div className="stats-grid four">
      <Stat icon={TrendingUp} label="Receitas previstas" value={money(income)} tone="green" sub={`${money(received)} recebidos`}/>
      <Stat icon={TrendingDown} label="Despesas previstas" value={money(spent)} tone="red" sub={`${money(paid)} pagos`}/>
      <Stat icon={Wallet} label="Saldo projetado" value={money(balance)} tone={balance>=0?'green':'red'} sub={pending ? `${money(pending)} ainda a pagar`:'Sem pendências'}/>
      <Stat icon={PiggyBank} label="Taxa de economia" value={`${savingsRate.toFixed(1).replace('.',',')}%`} tone={savingsRate>=0?'purple':'red'} sub="Saldo ÷ receitas"/>
    </div>

    <div className="two-col">
      <Card title="Receitas x Despesas">
        {monthly.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip formatter={value=>money(value)}/><Bar name="Receitas" dataKey="r" fill="#14b87a" radius={[6,6,0,0]}/><Bar name="Despesas" dataKey="d" fill="#1368ff" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div> : <div className="empty">Sem movimentações no período selecionado.</div>}
      </Card>

      <Card title="Despesas por categoria">
        {byCat.length ? <div className="pie-wrap"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82}>{byCat.map((_,index)=><Cell key={index} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip formatter={value=>money(value)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,7).map((item,index)=><div key={item.name}><span style={{background:COLORS[index%COLORS.length]}}></span><b>{item.name}</b><em>{money(item.value)}</em></div>)}</div></div> : <div className="empty">Sem despesas no período.</div>}
      </Card>
    </div>

    <div className="two-col">
      <Card title="Onde estamos gastando mais">
        {byCat.length ? <div className="ranking-list">{byCat.slice(0,8).map((item,index)=><div key={item.name}><span className="rank-number">{index+1}</span><div className="grow"><b>{item.name}</b><div className="progress"><i style={{width:`${spent>0?Math.min(100,item.value/spent*100):0}%`,background:COLORS[index%COLORS.length]}}/></div></div><strong>{money(item.value)}</strong><em>{spent>0?`${(item.value/spent*100).toFixed(1).replace('.',',')}%`:'0%'}</em></div>)}</div> : <div className="empty">Sem dados para ranking.</div>}
      </Card>

      <Card title="Perfil das despesas">
        {byKind.length ? <div className="report-breakdown">{byKind.map(([name,value],index)=><div key={name}><span style={{background:COLORS[index%COLORS.length]}}></span><b>{name}</b><strong>{money(value)}</strong><em>{spent>0?`${(value/spent*100).toFixed(1).replace('.',',')}%`:'0%'}</em></div>)}</div> : <div className="empty">Sem despesas no período.</div>}
      </Card>
    </div>

    <div className="two-col">
      <Card title="Movimentações por usuário">
        {byPerson.length ? <div className="report-breakdown">{byPerson.map(([name,count],index)=><div key={name}><span style={{background:COLORS[index%COLORS.length]}}></span><b>{name}</b><strong>{count}</strong><em>lançamento(s)</em></div>)}</div> : <div className="empty">Sem movimentações no período.</div>}
      </Card>
      <Card title="Leitura rápida">
        <div className="report-insights">
          <div className={balance>=0?'insight-good':'insight-bad'}><b>{balance>=0?'Saldo positivo':'Saldo negativo'}</b><span>{balance>=0?`As receitas superam as despesas em ${money(balance)}.`:`As despesas superam as receitas em ${money(Math.abs(balance))}.`}</span></div>
          {byCat[0]&&<div><b>Maior categoria</b><span>{byCat[0].name} representa {spent>0?(byCat[0].value/spent*100).toFixed(1).replace('.',','):'0'}% das despesas.</span></div>}
          <div><b>Pendências</b><span>{pending>0?`Ainda existem ${money(pending)} em despesas não pagas no período.`:'Não há despesas pendentes no período selecionado.'}</span></div>
        </div>
      </Card>
    </div>
  </>
}

function Config({user,users,categories,cards,onLogout,onRotateJoinCode,onChangePin,onNewCategory,onEditCategory,onEditCard,onToggleCard,onToggleUser,onBackup}){
  const [familyCode,setFamilyCode] = useState(()=>getStore('cm_join_code',''))
  const [rotating,setRotating] = useState(false)
  const rotate = async () => {
    setRotating(true)
    try {
      const result = await onRotateJoinCode()
      const code = Array.isArray(result) ? result[0] : result
      if (code) {
        setFamilyCode(code)
        setStore('cm_join_code', code)
      }
    } catch (err) {
      alert(err?.message || 'Não foi possível gerar o código.')
    } finally {
      setRotating(false)
    }
  }

  return <>
    <PageHead title="Configurações" subtitle="Gerencie usuários, categorias, cartões, segurança e backup." action={<button className="primary-btn compact" onClick={onBackup}><Download size={18}/> Backup JSON</button>}/>

    <div className="two-col split-wide">
      <Card title="Usuários do sistema">
        <div className="list">{users.map(u=><div className="list-row settings-user-row" key={u.id}>
          <div className="avatar">{u.name[0].toUpperCase()}</div>
          <div className="grow"><b>{u.name}</b><small>{u.role === 'admin' ? 'Administrador' : 'Usuário da família'}</small></div>
          <span className={u.is_active ? 'pill' : 'pill pill-off'}>{u.is_active ? 'Ativo' : 'Inativo'}</span>
          {user.role==='admin' && u.id!==user.id && <button className="secondary-btn compact" onClick={()=>onToggleUser(u)}>{u.is_active?'Desativar':'Ativar'}</button>}
        </div>)}</div>
      </Card>

      <Card title="Perfil da família">
        <div className="settings-text">
          <b>Carol & Marcos — Controle Financeiro</b>
          <p>Dados compartilhados e sincronizados entre os usuários da família.</p>
          <p>Usuário atual: <strong>{user.name}</strong></p>
          {user.role==='admin' && <div className="family-code"><span>Código para cadastrar outro usuário</span><strong>{familyCode || 'Gere um novo código'}</strong><button className="secondary-btn" onClick={rotate} disabled={rotating}>{rotating?'Gerando...':'Gerar novo código'}</button></div>}
        </div>
      </Card>
    </div>

    <div className="two-col split-wide">
      <Card title="Categorias" action={<button className="secondary-btn compact" onClick={onNewCategory}><Plus size={16}/> Nova categoria</button>}>
        <div className="settings-grid-list">
          {categories.map(cat=><div className="settings-line" key={cat.id}>
            <div className="category-dot" style={{background:cat.color || '#1368ff'}}/>
            <div className="grow"><b>{cat.name}</b><small>{cat.type==='income'?'Receita':cat.type==='expense'?'Despesa':'Receita e despesa'}</small></div>
            <button className="icon-square" onClick={()=>onEditCategory(cat)} title="Editar categoria"><Pencil size={16}/></button>
          </div>)}
        </div>
      </Card>

      <Card title="Cartões cadastrados">
        {cards.length===0 ? <div className="empty">Nenhum cartão cadastrado.</div> :
        <div className="settings-grid-list">{cards.map(card=><div className="settings-line" key={card.id}>
          <div className="mini-icon expense"><CreditCard size={18}/></div>
          <div className="grow"><b>{card.name} {card.last4 ? '•••• ' + card.last4 : ''}</b><small>{card.holderName ? `Titular: ${card.holderName} • ` : ''}Limite {money(card.limit)} • fecha dia {card.closingDay || '—'} • vence dia {card.dueDay || '—'}</small></div>
          <span className={card.isActive ? 'pill' : 'pill pill-off'}>{card.isActive ? 'Ativo' : 'Inativo'}</span>
          <button className="icon-square" onClick={()=>onEditCard(card)} title="Editar cartão"><Pencil size={16}/></button>
          <button className="secondary-btn compact" onClick={()=>onToggleCard(card)}>{card.isActive ? 'Desativar' : 'Ativar'}</button>
        </div>)}</div>}
      </Card>
    </div>

    <div className="two-col split-wide">
      <Card title="Segurança e acesso">
        <div className="settings-text">
          <p>✓ PIN protegido com hash no banco</p>
          <p>✓ Bloqueio temporário após várias tentativas incorretas</p>
          <p>✓ Sessões e dados separados por família</p>
          <button className="secondary-btn" onClick={onChangePin}><Settings size={18}/> Alterar meu PIN</button>
          <p className="warning">Em computadores públicos, use “Sair da conta” ao terminar.</p>
        </div>
      </Card>

      <Card title="Dados e backup">
        <div className="settings-text">
          <p>O backup JSON inclui lançamentos, cartões, categorias, orçamentos e metas. Ele não contém PINs nem chaves secretas.</p>
          <div className="settings-actions">
            <button className="secondary-btn" onClick={onBackup}><Download size={18}/> Baixar backup</button>
            <button className="secondary-btn" onClick={onLogout}><LogOut size={18}/> Sair da conta</button>
          </div>
        </div>
      </Card>
    </div>
  </>
}

function transactionOrigin(item){
  if(item.source==='receipt') return {label:'Cupom fiscal',page:'despesas'}
  if(item.source==='card' || item.cardId) return {label:'Cartões',page:'cartoes'}
  if(item.type==='income' || item.type==='in') return {label:'Receitas',page:'receitas'}
  return {label:'Despesas',page:'despesas'}
}

function TransactionViewModal({item,cards,onClose,onGoTo}){
  const origin=transactionOrigin(item)
  const card=cards.find(card=>card.id===item.cardId)
  const formatDate=value=>value ? new Date(value+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const createdDate=item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—'
  const typeLabel=item.type==='income'||item.type==='in' ? 'Receita' : 'Despesa'
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal transaction-view-modal">
      <div className="modal-head"><h2>Detalhes do lançamento</h2><button onClick={onClose}><X/></button></div>
      <div className="view-origin">
        <div className={`mini-icon ${typeLabel==='Receita'?'income':'expense'}`}>{typeLabel==='Receita'?<TrendingUp size={20}/>:<ReceiptText size={20}/>}</div>
        <div><small>Origem do lançamento</small><b>{origin.label}</b></div>
        <button className="secondary-btn compact" onClick={()=>onGoTo(origin.page)}>Abrir em {origin.label}</button>
      </div>
      <div className="view-title"><span>{typeLabel}</span><h3>{item.desc}</h3><strong className={typeLabel==='Receita'?'good':'bad'}>{typeLabel==='Receita'?'+ ':'- '}{money(item.amount)}</strong></div>
      <div className="view-detail-grid">
        <div><span>Categoria</span><b>{item.category || 'Sem categoria'}</b></div>
        <div><span>Tipo</span><b>{item.kind || typeLabel}</b></div>
        <div><span>Situação</span><b>{getDisplayStatus(item)}</b></div>
        <div><span>Lançado por</span><b>{item.by || 'Usuário'}</b></div>
        <div><span>Data</span><b>{formatDate(item.date)}</b></div>
        <div><span>Vencimento</span><b>{formatDate(item.dueDate)}</b></div>
        <div><span>Pagamento</span><b>{formatDate(item.paidDate)}</b></div>
        <div><span>Criado em</span><b>{createdDate}</b></div>
        {card && <div><span>Cartão</span><b>{card.name}{card.holderName ? ` • ${card.holderName}` : ''}</b></div>}
        {item.totalInstallments>1 && <div><span>Parcela</span><b>{item.installmentNumber || '—'} de {item.totalInstallments}</b></div>}
        {item.merchant && <div><span>Estabelecimento</span><b>{item.merchant}</b></div>}
      </div>
      {item.notes && <div className="view-notes"><span>Observações</span><p>{item.notes}</p></div>}
      <button className="primary-btn" onClick={onClose}>Fechar</button>
    </div>
  </div>
}

function CategoryModal({category,onClose,onSave}){
  const [form,setForm]=useState({name:category?.name || '',type:category?.type || 'expense'})
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const save=async()=>{
    if(!form.name.trim()) return setError('Informe o nome da categoria.')
    setBusy(true)
    setError('')
    try{
      await onSave({id:category?.id || null,name:form.name.trim(),type:form.type})
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível salvar a categoria.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-head"><h2>{category?'Editar categoria':'Nova categoria'}</h2><button onClick={onClose}><X/></button></div>
      <label>Nome</label>
      <input value={form.name} onChange={event=>setForm({...form,name:event.target.value})} placeholder="Ex.: Bebê, Pets, Presentes"/>
      <label>Usar em</label>
      <select value={form.type} onChange={event=>setForm({...form,type:event.target.value})}><option value="expense">Despesas</option><option value="income">Receitas</option><option value="both">Receitas e despesas</option></select>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Salvar categoria'}</button>
    </div>
  </div>
}

function ChangePinModal({onClose,onSave}){
  const [currentPin,setCurrentPin]=useState('')
  const [newPin,setNewPin]=useState('')
  const [confirmPin,setConfirmPin]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const save=async()=>{
    if(!/^\d{4}$/.test(currentPin)) return setError('Informe seu PIN atual de 4 dígitos.')
    if(!/^\d{4}$/.test(newPin)) return setError('O novo PIN deve ter exatamente 4 dígitos.')
    if(newPin!==confirmPin) return setError('A confirmação do novo PIN não confere.')
    if(newPin===currentPin) return setError('Escolha um PIN diferente do atual.')
    setBusy(true)
    setError('')
    try{
      await onSave(currentPin,newPin)
      onClose()
      alert('PIN alterado com sucesso.')
    }catch(err){
      setError(err?.message || 'Não foi possível alterar o PIN.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-head"><h2>Alterar PIN</h2><button onClick={onClose}><X/></button></div>
      <label>PIN atual</label><input type="password" inputMode="numeric" maxLength={4} value={currentPin} onChange={event=>setCurrentPin(event.target.value.replace(/\D/g,''))}/>
      <label>Novo PIN</label><input type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={event=>setNewPin(event.target.value.replace(/\D/g,''))}/>
      <label>Confirmar novo PIN</label><input type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={event=>setConfirmPin(event.target.value.replace(/\D/g,''))}/>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Alterando...':'Alterar PIN'}</button>
    </div>
  </div>
}


function normalizeReceiptText(value=''){
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
}

function parseReceiptAmount(value=''){
  const clean = String(value)
    .replace(/R\$/gi,'')
    .replace(/\s/g,'')
    .replace(/\.(?=\d{3}(?:\D|$))/g,'')
    .replace(',','.')
    .replace(/[^0-9.-]/g,'')
  const number = Number(clean)
  return Number.isFinite(number) ? number : 0
}

function categoryForReceiptItem(description,categories){
  const text=normalizeReceiptText(description).toLowerCase()
  const find=name=>categories.find(cat=>normalizeReceiptText(cat.name).toLowerCase()===normalizeReceiptText(name).toLowerCase())?.id || ''
  if(/shampoo|sabonete|desodorante|absorvente|papel higienico|creme dental|pasta dental|escova dental/.test(text)) return find('Cuidado pessoal') || find('Supermercado')
  if(/remedio|medicamento|dipirona|paracetamol|ibuprofeno|vitamina|farmac/.test(text)) return find('Saúde') || find('Supermercado')
  if(/camiseta|camisa|calca|cueca|meia|roupa/.test(text)) return find('Roupa') || find('Supermercado')
  if(/arroz|feijao|leite|carne|frango|bovina|suina|pao|queijo|presunto|ovo|cafe|acucar|farinha|macarrao|oleo|manteiga|margarina|refrigerante|suco|agua|cerveja|verdura|fruta|legume|biscoito|bolacha|iogurte/.test(text)) return find('Alimentação') || find('Supermercado')
  return find('Supermercado') || find('Alimentação') || ''
}


async function preprocessReceiptImage(file, mode='gray'){
  const bitmap=await createImageBitmap(file)
  const baseWidth=bitmap.width
  const baseHeight=bitmap.height
  const targetWidth=Math.min(2400,Math.max(1600,Math.round(baseWidth*1.8)))
  const scale=targetWidth/baseWidth
  const targetHeight=Math.round(baseHeight*scale)

  const canvas=document.createElement('canvas')
  canvas.width=targetWidth
  canvas.height=targetHeight
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  ctx.fillStyle='#fff'
  ctx.fillRect(0,0,targetWidth,targetHeight)
  ctx.imageSmoothingEnabled=true
  ctx.imageSmoothingQuality='high'
  ctx.drawImage(bitmap,0,0,targetWidth,targetHeight)
  bitmap.close?.()

  const image=ctx.getImageData(0,0,targetWidth,targetHeight)
  const data=image.data
  const hist=new Uint32Array(256)
  const gray=new Uint8Array(targetWidth*targetHeight)

  for(let i=0,p=0;i<data.length;i+=4,p++){
    const value=Math.max(0,Math.min(255,Math.round(data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114)))
    gray[p]=value
    hist[value]++
  }

  const total=gray.length
  const percentile=(ratio)=>{
    const goal=total*ratio
    let sum=0
    for(let i=0;i<256;i++){
      sum+=hist[i]
      if(sum>=goal) return i
    }
    return 255
  }
  const low=percentile(.04)
  const high=Math.max(low+20,percentile(.96))

  const stretched=new Uint8Array(gray.length)
  const hist2=new Uint32Array(256)
  for(let i=0;i<gray.length;i++){
    const v=Math.max(0,Math.min(255,Math.round((gray[i]-low)*255/(high-low))))
    stretched[i]=v
    hist2[v]++
  }

  let threshold=180
  if(mode==='binary'){
    let sum=0,totalCount=stretched.length
    for(let i=0;i<256;i++) sum+=i*hist2[i]
    let sumB=0,wB=0,maxVariance=0
    for(let t=0;t<256;t++){
      wB+=hist2[t]
      if(!wB) continue
      const wF=totalCount-wB
      if(!wF) break
      sumB+=t*hist2[t]
      const mB=sumB/wB
      const mF=(sum-sumB)/wF
      const variance=wB*wF*(mB-mF)*(mB-mF)
      if(variance>maxVariance){
        maxVariance=variance
        threshold=t
      }
    }
    threshold=Math.max(120,Math.min(220,threshold+8))
  }

  for(let i=0,p=0;i<data.length;i+=4,p++){
    let v=stretched[p]
    if(mode==='binary') v=v<threshold?0:255
    else {
      const contrast=1.22
      v=Math.max(0,Math.min(255,Math.round((v-128)*contrast+128)))
    }
    data[i]=data[i+1]=data[i+2]=v
    data[i+3]=255
  }

  ctx.putImageData(image,0,0)
  return await new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao preparar imagem do cupom.')),'image/jpeg',.94)
  })
}

function scoreReceiptParse(parsed,confidence=0){
  const items=parsed.items||[]
  const itemSum=items.reduce((sum,item)=>sum+Number(item.amount||0),0)
  let score=Math.max(0,Number(confidence)||0)/5
  score+=Math.min(items.length,20)*4
  score+=parsed.store && !/cn.?j|cpf|danfe|nfce|sat/i.test(normalizeReceiptText(parsed.store)) ? 8 : 0
  score+=parsed.total>0 ? 10 : 0
  if(parsed.total>0 && itemSum>0){
    const ratio=Math.abs(itemSum-parsed.total)/parsed.total
    if(ratio<.02) score+=18
    else if(ratio<.08) score+=10
    else if(ratio<.2) score+=4
  }
  score+=Math.min(String(parsed.rawText||'').length/120,12)
  return score
}

function parseReceiptOcr(text,categories){
  const rawLines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
  const lines=rawLines.map(line=>({raw:line,norm:normalizeReceiptText(line)}))
  const noise=/\b(CNPJ|CPF|DANFE|NFC|NFCE|SAT|CUPOM|DOCUMENTO|CHAVE|TRIBUT|ICMS|PAGAMENTO|FORMA DE PAGAMENTO|TROCO|DINHEIRO|CARTAO|PIX|DESCONTO|ACRESCIMO|SUBTOTAL|TOTAL A PAGAR|VALOR TOTAL|QTD TOTAL|QUANTIDADE TOTAL|CONSUMIDOR|OPERADOR|PROTOCOLO|AUTORIZACAO|CONTINGENCIA|EMISSAO|SERIE|EXTRATO)\b/i
  const isNoiseLine=line=>{
    const compact=normalizeReceiptText(line).toUpperCase().replace(/[^A-Z0-9]/g,'')
    if(noise.test(normalizeReceiptText(line))) return true
    if(/^(CN)?P?J\d*|^CPF\d*/.test(compact)) return true
    if(compact.includes('CNPJ') || compact.includes('DANFE') || compact.includes('NFCE')) return true
    return false
  }

  let store=''
  for(const line of lines.slice(0,14)){
    const digitCount=(line.raw.match(/\d/g)||[]).length
    if(line.norm.length<3 || line.norm.length>80) continue
    if(isNoiseLine(line.raw)) continue
    if(digitCount>5) continue
    if(!/[A-Za-zÀ-ÿ]{3}/.test(line.raw)) continue
    store=line.raw.replace(/^[^A-Za-zÀ-ÿ]+/,'').trim()
    if(store) break
  }

  let date=''
  const dateRegex=/\b([0-3]?\d)[\/.-]([01]?\d)[\/.-](20\d{2})\b/
  for(const line of lines){
    const match=line.raw.match(dateRegex)
    if(match){
      date=`${match[3]}-${String(match[2]).padStart(2,'0')}-${String(match[1]).padStart(2,'0')}`
      break
    }
  }
  if(!date) date=localISODate()

  let total=0
  const totalKeys=/TOTAL A PAGAR|VALOR TOTAL|TOTAL R\$|TOTAL\s*:/i
  for(let i=lines.length-1;i>=0;i--){
    if(!totalKeys.test(lines[i].norm)) continue
    const nums=[...lines[i].raw.matchAll(/(?:R\$\s*)?(\d{1,6}(?:\.\d{3})*,\d{2}|\d{1,6}[.,]\d{2})/g)]
    if(nums.length){
      total=parseReceiptAmount(nums[nums.length-1][1])
      if(total>0) break
    }
  }

  const items=[]
  let previousCandidate=''
  for(const line of lines){
    const moneyMatches=[...line.raw.matchAll(/(?:R\$\s*)?(\d{1,6}(?:\.\d{3})*,\d{2}|\d{1,6}[.,]\d{2})/g)]
    const hasMoney=moneyMatches.length>0

    if(!hasMoney){
      if(!isNoiseLine(line.raw) && /[A-Za-zÀ-ÿ]{3}/.test(line.raw) && line.norm.length<=90){
        previousCandidate=line.raw
      }
      continue
    }

    if(isNoiseLine(line.raw)) {
      previousCandidate=''
      continue
    }

    const amount=parseReceiptAmount(moneyMatches[moneyMatches.length-1][1])
    if(amount<=0 || amount>100000) {
      previousCandidate=''
      continue
    }

    let description=line.raw
    const last=moneyMatches[moneyMatches.length-1]
    description=description.slice(0,last.index)
    description=description
      .replace(/\b\d{8,14}\b/g,' ')
      .replace(/^\s*\d{1,4}\s+/, '')
      .replace(/\b\d+[.,]\d{1,3}\s*[xX]\s*\d+[.,]\d{2}\b/g,' ')
      .replace(/\b(UN|UND|UNID|KG|KILO|LT|L|PC|PCT|CX)\b/gi,' ')
      .replace(/\s+/g,' ')
      .trim()

    if(!/[A-Za-zÀ-ÿ]{3}/.test(description) && previousCandidate){
      description=previousCandidate
    }

    description=description.replace(/^[\-.:*#]+/,'').trim()
    if(!description || description.length<3){
      previousCandidate=''
      continue
    }

    const normalizedDescription=normalizeReceiptText(description).toLowerCase()
    if(items.some(item=>normalizeReceiptText(item.description).toLowerCase()===normalizedDescription && Math.abs(item.amount-amount)<0.001)){
      previousCandidate=''
      continue
    }

    items.push({
      id:crypto.randomUUID(),
      description,
      amount,
      categoryId:categoryForReceiptItem(description,categories),
    })
    previousCandidate=''
  }

  const sum=items.reduce((s,item)=>s+Number(item.amount||0),0)
  if(!total && sum>0) total=sum

  if(items.length===0 && total>0){
    items.push({
      id:crypto.randomUUID(),
      description:store ? `Compra em ${store}` : 'Compra do cupom fiscal',
      amount:total,
      categoryId:categoryForReceiptItem('supermercado',categories),
    })
  }

  return {store,date,total,items,rawText:text}
}

function ReceiptImportModal({user,categories,onClose,onImport}){
  const [file,setFile]=useState(null)
  const [preview,setPreview]=useState('')
  const [progress,setProgress]=useState(0)
  const [processing,setProcessing]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [store,setStore]=useState('')
  const [date,setDate]=useState(localISODate())
  const [total,setTotal]=useState('')
  const [items,setItems]=useState([])
  const [analyzed,setAnalyzed]=useState(false)

  useEffect(()=>{
    if(!file){ setPreview(''); return }
    const url=URL.createObjectURL(file)
    setPreview(url)
    return ()=>URL.revokeObjectURL(url)
  },[file])

  const analyze=async()=>{
    if(!file) return setError('Escolha ou fotografe um cupom fiscal.')
    setError('')
    setProcessing(true)
    setProgress(1)

    const categoryIdByName = name => {
      const target=normalizeReceiptText(name||'').toLowerCase()
      return categories.find(cat=>normalizeReceiptText(cat.name).toLowerCase()===target)?.id || categoryForReceiptItem(name||'supermercado',categories)
    }

    try{
      // 1) Leitura principal com IA visual (mais precisa para cupons térmicos)
      setProgress(8)
      let aiFailureMessage=''
      try{
        const prepared=await preprocessReceiptImage(file,'gray')
        setProgress(22)
        const ai=await api.readReceiptAI(user.token,prepared)
        const receipt=ai?.receipt
        if(!receipt || !Array.isArray(receipt.items)) throw new Error('Resposta da IA sem itens.')

        const aiItems=receipt.items
          .map(item=>({
            id:crypto.randomUUID(),
            description:String(item.description||'').trim(),
            amount:Number(item.total_price||0),
            quantity:Number(item.quantity||1),
            unit:String(item.unit||''),
            unitPrice:Number(item.unit_price||item.total_price||0),
            confidence:Number(item.confidence||0),
            categoryId:categoryIdByName(item.category_hint||'Supermercado'),
          }))
          .filter(item=>item.description && item.amount>0)

        if(aiItems.length){
          setStore(String(receipt.store_name||'').trim())
          setDate(receipt.purchase_date || localISODate())
          setTotal(Number(receipt.total_amount||0) ? String(Number(receipt.total_amount).toFixed(2)).replace('.',',') : '')
          setItems(aiItems)
          setAnalyzed(true)
          setProgress(100)

          const lowConfidence=aiItems.filter(item=>item.confidence>0 && item.confidence<0.65).length
          if(lowConfidence){
            setError(`A IA marcou ${lowConfidence} item(ns) com baixa confiança. Confira esses nomes e valores antes de confirmar.`)
          }
          return
        }
        throw new Error('A IA não encontrou itens.')
      }catch(aiError){
        aiFailureMessage=String(aiError?.message || aiError || 'Falha desconhecida na leitura por IA.')
        // 2) Fallback gratuito/local com OCR se a Edge Function ainda não estiver ativa ou a IA falhar
        setProgress(35)
      }

      const {createWorker}=await import('tesseract.js')
      const worker=await createWorker('por',1,{
        logger:message=>{
          if(message.status==='recognizing text' && Number.isFinite(message.progress)){
            setProgress(Math.max(38,Math.min(94,38+Math.round(message.progress*28))))
          }
        }
      })

      const gray=await preprocessReceiptImage(file,'gray')
      await worker.setParameters({
        tessedit_pageseg_mode:'6',
        preserve_interword_spaces:'1',
        user_defined_dpi:'300',
      })
      const first=await worker.recognize(gray)
      const firstParsed=parseReceiptOcr(first?.data?.text || '',categories)
      let best={parsed:firstParsed,score:scoreReceiptParse(firstParsed,first?.data?.confidence)}

      const needsSecondPass=
        firstParsed.items.length<3 ||
        String(first?.data?.text||'').length<180 ||
        (firstParsed.total>0 && Math.abs(firstParsed.items.reduce((s,item)=>s+Number(item.amount||0),0)-firstParsed.total)>.15*firstParsed.total)

      if(needsSecondPass){
        setProgress(72)
        const binary=await preprocessReceiptImage(file,'binary')
        await worker.setParameters({
          tessedit_pageseg_mode:'11',
          preserve_interword_spaces:'1',
          user_defined_dpi:'300',
        })
        const second=await worker.recognize(binary)
        const secondParsed=parseReceiptOcr(second?.data?.text || '',categories)
        const candidate={parsed:secondParsed,score:scoreReceiptParse(secondParsed,second?.data?.confidence)}
        if(candidate.score>best.score) best=candidate
      }

      await worker.terminate()
      const parsed=best.parsed
      setStore(parsed.store || '')
      setDate(parsed.date)
      setTotal(parsed.total ? String(parsed.total.toFixed(2)).replace('.',',') : '')
      setItems(parsed.items)
      setAnalyzed(true)
      setProgress(100)
      setError(`A leitura por IA falhou: ${aiFailureMessage || 'motivo não informado'}. O sistema usou o OCR local. Confira todos os itens antes de confirmar.`)
    }catch(err){
      setError('Não consegui ler esse cupom com segurança. Tente uma foto mais próxima, reta, bem iluminada e com o texto ocupando quase toda a imagem.')
    }finally{
      setProcessing(false)
    }
  }
  const updateItem=(id,patch)=>setItems(current=>current.map(item=>item.id===id?{...item,...patch}:item))
  const removeItem=id=>setItems(current=>current.filter(item=>item.id!==id))
  const addItem=()=>setItems(current=>[...current,{id:crypto.randomUUID(),description:'',amount:'',categoryId:categoryForReceiptItem('supermercado',categories)}])

  const itemsTotal=items.reduce((sum,item)=>sum+Number(item.amount||0),0)
  const receiptTotal=parseReceiptAmount(total)
  const difference=receiptTotal ? Number((itemsTotal-receiptTotal).toFixed(2)) : 0

  const confirm=async()=>{
    const cleanItems=items
      .map(item=>({...item,description:item.description.trim(),amount:Number(item.amount)}))
      .filter(item=>item.description && item.amount>0)

    if(!cleanItems.length) return setError('Revise os itens antes de salvar.')
    setSaving(true)
    setError('')
    try{
      await onImport({
        storeName:store.trim() || 'Supermercado',
        receiptDate:date || localISODate(),
        totalAmount:receiptTotal || itemsTotal,
        items:cleanItems,
      })
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível salvar o cupom.')
    }finally{
      setSaving(false)
    }
  }

  return <div className="modal-backdrop receipt-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!processing&&!saving)onClose()}}>
    <div className="modal receipt-modal">
      <div className="modal-head"><h2>🧾 Ler cupom fiscal</h2><button onClick={onClose} disabled={processing||saving}><X/></button></div>

      {!analyzed && <>
        <div className="receipt-intro"><b>Fotografe ou envie o cupom</b><span>A imagem será analisada pela IA para identificar os itens. Antes de salvar, você poderá conferir e corrigir tudo. Se a IA não estiver disponível, o sistema usa OCR local como alternativa.</span></div>
        <label className="receipt-upload">
          <input type="file" accept="image/*" capture="environment" onChange={event=>setFile(event.target.files?.[0]||null)}/>
          <ReceiptText size={28}/>
          <b>{file ? 'Trocar imagem' : 'Tirar foto ou escolher imagem'}</b>
          <small>JPG, PNG ou foto da câmera</small>
        </label>
        {preview&&<img className="receipt-preview" src={preview} alt="Prévia do cupom fiscal"/>}
        {processing&&<div className="ocr-progress"><div><span>Reconhecendo texto...</span><b>{progress}%</b></div><div className="progress"><i style={{width:`${progress}%`}}/></div><small>Em celulares mais simples isso pode levar alguns segundos.</small></div>}
        {error&&<div className="auth-msg">{error}</div>}
        <button className="primary-btn" disabled={!file||processing} onClick={analyze}>{processing?'Lendo cupom...':'Ler cupom automaticamente'}</button>
      </>}

      {analyzed&&<>
        <div className="receipt-summary-grid">
          <div><label>Estabelecimento</label><input value={store} onChange={event=>setStore(event.target.value)} placeholder="Nome do supermercado"/></div>
          <div><label>Data da compra</label><input type="date" value={date} onChange={event=>setDate(event.target.value)}/></div>
          <div><label>Total reconhecido</label><input inputMode="decimal" value={total} onChange={event=>setTotal(event.target.value)} placeholder="0,00"/></div>
          <div className="receipt-readonly"><span>Soma dos itens</span><strong>{money(itemsTotal)}</strong></div>
        </div>

        {Math.abs(difference)>0.02&&<div className="receipt-warning">⚠ A soma dos itens está {difference>0?'acima':'abaixo'} do total do cupom em <b>{money(Math.abs(difference))}</b>. Revise os itens antes de confirmar.</div>}

        <div className="receipt-items-head"><div><h3>Itens encontrados</h3><small>{items.length} item(ns)</small></div><button className="secondary-btn compact" onClick={addItem}><Plus size={16}/> Adicionar item</button></div>

        <div className="receipt-items">
          {items.map((item,index)=><div className="receipt-item" key={item.id}>
            <span className="receipt-item-number">{index+1}</span>
            <input className="receipt-item-desc" value={item.description} onChange={event=>updateItem(item.id,{description:event.target.value})} placeholder="Descrição do item"/>
            <select value={item.categoryId} onChange={event=>updateItem(item.id,{categoryId:event.target.value})}>
              <option value="">Sem categoria</option>
              {categories.filter(cat=>['expense','both'].includes(cat.type)).map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input className="receipt-item-value" inputMode="decimal" value={item.amount} onChange={event=>updateItem(item.id,{amount:event.target.value.replace(',','.')})}/>
            <button className="receipt-remove" title="Remover item" onClick={()=>removeItem(item.id)}><Trash2 size={17}/></button>
          </div>)}
        </div>

        {error&&<div className="auth-msg">{error}</div>}
        <div className="receipt-footer">
          <button className="secondary-btn" disabled={saving} onClick={()=>{setAnalyzed(false);setItems([]);setError('')}}>Ler outra foto</button>
          <button className="primary-btn" disabled={saving||!items.length} onClick={confirm}><Save size={18}/> {saving?'Salvando...':'Confirmar e lançar itens'}</button>
        </div>
        <small className="receipt-footnote">Cada item será lançado como despesa e ficará identificado como lançado por {user.name}.</small>
      </>}
    </div>
  </div>
}

function NewTransactionModal({type,user,categories,cards,item,onClose,onSave}){
  const availableCategories = categories.filter(c => type==='receita' ? ['income','both'].includes(c.type) : ['expense','both'].includes(c.type))
  const [form,setForm]=useState({
    desc:item?.desc || '',
    amount:item?.amount ? String(item.amount) : '',
    categoryId:item?.categoryId || availableCategories[0]?.id || '',
    kind:item?.kind || (type==='receita'?'Extra':'Variável'),
    status:item?.statusKey || (type==='receita'?'received':'paid'),
    dueDate:item?.dueDate || '',
    cardId:item?.cardId || '',
    totalInstallments:item?.totalInstallments || 2,
    repeatFuture:false,
  })
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')

  const save=async()=>{
    setError('')
    if(!form.desc.trim()||!Number(form.amount)) return setError('Informe a descrição e o valor.')
    if(form.kind==='Parcelada' && (!form.dueDate || Number(form.totalInstallments)<2)) return setError('Informe o vencimento e pelo menos 2 parcelas.')
    setBusy(true)
    try {
      await onSave({
        description:form.desc.trim(),
        amount:Number(form.amount),
        category_id:form.categoryId || null,
        card_id:form.cardId || null,
        kind:KIND_DB[form.kind] || 'other',
        status:form.status,
        type:type==='receita'?'income':'expense',
        transaction_date:item?.date || localISODate(),
        due_date:form.dueDate || null,
        paid_date:['paid','received'].includes(form.status) ? localISODate() : null,
        paid_by:['paid','received'].includes(form.status) ? user.id : null,
      }, {
        id:item?.id || null,
        kind:form.kind,
        totalInstallments:Number(form.totalInstallments || 0),
        repeatFuture:form.repeatFuture,
      })
      onClose()
    } catch(err) {
      setError(err?.message || 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal">
    <div className="modal-head"><h2>{item?'Editar lançamento':type==='receita'?'Nova receita':'Nova despesa'}</h2><button onClick={onClose}><X/></button></div>
    <label>Descrição</label>
    <input value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder={type==='receita'?'Ex.: Venda de material':'Ex.: Supermercado'}/>
    <label>Valor</label>
    <input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value.replace(',','.')})} placeholder="0,00"/>
    <label>Categoria</label>
    <select value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}><option value="">Sem categoria</option>{availableCategories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
    <label>Tipo</label>
    <select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{type==='receita'?<><option>Recorrente</option><option>Extra</option></>:<><option>Fixa</option><option>Variável</option><option>Parcelada</option><option>Cartão</option></>}</select>
    <label>Situação</label>
    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{type==='receita'?<><option value="received">Recebida</option><option value="pending">Pendente</option></>:<><option value="paid">Pago</option><option value="pending">A pagar</option></>}</select>
    <label>Vencimento <small className="label-help">(opcional para receitas)</small></label>
    <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
    {type==='despesa' && cards.length>0 && <><label>Cartão <small className="label-help">(opcional)</small></label><select value={form.cardId} onChange={e=>setForm({...form,cardId:e.target.value})}><option value="">Não usar cartão</option>{cards.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></>}
    {!item && form.kind==='Parcelada' && <><label>Quantidade de parcelas</label><input type="number" min="2" max="240" value={form.totalInstallments} onChange={e=>setForm({...form,totalInstallments:e.target.value})}/><small className="form-help">O sistema criará as parcelas mensais automaticamente.</small></>}
    {!item && (form.kind==='Fixa' || form.kind==='Recorrente') && <label className="checkbox-line"><input type="checkbox" checked={form.repeatFuture} onChange={e=>setForm({...form,repeatFuture:e.target.checked})}/><span>Gerar também os próximos 11 meses</span></label>}
    <div className="modal-user">{item?'Editando como':'Lançado por'} <b>{user.name}</b></div>
    {error&&<div className="auth-msg">{error}</div>}
    <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':item?'Salvar alterações':'Salvar lançamento'}</button>
  </div></div>
}

function NewCardModal({user,users,card,onClose,onSave}){
  const [form,setForm] = useState({
    name:card?.name || '',
    holderUserId:card?.holderUserId || user.id,
    brand:card?.brand || 'mastercard',
    color:card?.color || '#175CD3',
    last4:card?.last4 || '',
    limit:card?.limit ? String(card.limit) : '',
    closingDay:card?.closingDay ? String(card.closingDay) : '',
    dueDay:card?.dueDay ? String(card.dueDay) : '',
  })
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')

  const save = async () => {
    setError('')
    if (!form.name.trim()) return setError('Informe o nome do cartão.')
    if (!Number(form.limit)) return setError('Informe o limite do cartão.')
    if (!Number(form.closingDay) || Number(form.closingDay)<1 || Number(form.closingDay)>31) return setError('Informe um dia de fechamento entre 1 e 31.')
    if (!Number(form.dueDay) || Number(form.dueDay)<1 || Number(form.dueDay)>31) return setError('Informe um dia de vencimento entre 1 e 31.')
    setBusy(true)
    try {
      await onSave({
        id:card?.id || null,
        name: form.name.trim(),
        holder_user_id: form.holderUserId || null,
        brand: form.brand,
        color: form.color,
        last4: form.last4.replace(/\D/g,'').slice(-4) || null,
        credit_limit: Number(form.limit),
        closing_day: Number(form.closingDay),
        due_day: Number(form.dueDay),
        created_by: user.id,
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar o cartão.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal">
    <div className="modal-head"><h2>{card?'Editar cartão':'Novo cartão'}</h2><button onClick={onClose}><X/></button></div>
    <label>Nome do cartão</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Nubank"/>
    <label>Titular do cartão</label>
    <select value={form.holderUserId} onChange={e=>setForm({...form,holderUserId:e.target.value})}>
      {users.filter(item=>item.is_active!==false).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    <div className="card-style-grid">
      <div><label>Logo / bandeira</label><select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>{CARD_BRANDS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <div><label>Cor do cartão</label><div className="card-color-picker">
        {CARD_COLOR_OPTIONS.map(option=><button key={option.value} type="button" className={form.color.toLowerCase()===option.value.toLowerCase()?'color-dot selected':'color-dot'} style={{background:option.value}} onClick={()=>setForm({...form,color:option.value})} title={option.name}/>)}
        <label className="custom-color" title="Escolher outra cor"><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/><span>+</span></label>
      </div></div>
    </div>
    <div className="card-mini-preview" style={{'--card-color':form.color,color:cardTextColor(form.color)}}>
      <div className="cc-top"><small>Titular • {users.find(item=>item.id===form.holderUserId)?.name || user.name}</small><CardBrandMark brand={form.brand}/></div>
      <b>{form.name || 'Seu cartão'}</b>
      <span>•••• {form.last4 || '0000'}</span>
    </div>
    <label>Últimos 4 dígitos <small className="label-help">(opcional)</small></label><input inputMode="numeric" maxLength={4} value={form.last4} onChange={e=>setForm({...form,last4:e.target.value.replace(/\D/g,'')})} placeholder="1234"/>
    <label>Limite</label><input inputMode="decimal" value={form.limit} onChange={e=>setForm({...form,limit:e.target.value.replace(',','.')})} placeholder="0,00"/>
    <div className="form-row"><div><label>Dia do fechamento</label><input inputMode="numeric" maxLength={2} value={form.closingDay} onChange={e=>setForm({...form,closingDay:e.target.value.replace(/\D/g,'')})}/></div><div><label>Dia do vencimento</label><input inputMode="numeric" maxLength={2} value={form.dueDay} onChange={e=>setForm({...form,dueDay:e.target.value.replace(/\D/g,'')})}/></div></div>
    {error&&<div className="auth-msg">{error}</div>}
    <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':card?'Salvar alterações':'Cadastrar cartão'}</button>
  </div></div>
}


function NewCardPurchaseModal({user,cards,categories,onClose,onSave}){
  const expenseCategories=categories.filter(cat=>['expense','both'].includes(cat.type))
  const [form,setForm]=useState({
    cardId:cards[0]?.id || '',
    description:'',
    amount:'',
    purchaseDate:localISODate(),
    categoryId:expenseCategories.find(cat=>cat.name==='Supermercado')?.id || expenseCategories[0]?.id || '',
    installments:1,
  })
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const selectedCard=cards.find(card=>card.id===form.cardId)
  const installmentCount=Math.max(1,Number(form.installments||1))
  const total=Number(String(form.amount||'').replace(',','.')) || 0
  const firstDue=selectedCard ? cardFirstDueDate(form.purchaseDate,selectedCard.closingDay,selectedCard.dueDay) : ''
  const cents=Math.round(total*100)
  const baseCents=installmentCount ? Math.floor(cents/installmentCount) : 0
  const remainder=installmentCount ? cents-baseCents*installmentCount : 0
  const preview=Array.from({length:Math.min(installmentCount,12)},(_,index)=>({
    n:index+1,
    amount:(baseCents+(index===installmentCount-1?remainder:0))/100,
    due:firstDue ? (()=> {
      const [y,m,d]=firstDue.split('-').map(Number)
      const date=new Date(y,m-1+index,1,12,0,0)
      return safeDateWithDay(date.getFullYear(),date.getMonth(),d)
    })() : '',
  }))

  const save=async()=>{
    setError('')
    if(!selectedCard) return setError('Selecione um cartão.')
    if(!form.description.trim()) return setError('Informe a descrição da compra.')
    if(total<=0) return setError('Informe o valor da compra.')
    if(installmentCount<1 || installmentCount>48) return setError('Use entre 1 e 48 parcelas.')
    const available=Math.max(Number(selectedCard.limit||0)-Number(selectedCard.used||0),0)
    if(total>available+0.001) return setError(`A compra ultrapassa o limite disponível de ${money(available)}.`)

    setBusy(true)
    try{
      await onSave({
        card:selectedCard,
        description:form.description.trim(),
        total,
        purchaseDate:form.purchaseDate,
        categoryId:form.categoryId || null,
        installments:installmentCount,
        firstDue,
      })
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível lançar a compra.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal card-purchase-modal">
      <div className="modal-head"><h2>Nova compra no cartão</h2><button onClick={onClose}><X/></button></div>

      <label>Cartão</label>
      <select value={form.cardId} onChange={event=>setForm({...form,cardId:event.target.value})}>
        {cards.map(card=><option key={card.id} value={card.id}>{card.name}{card.holderName ? ` • ${card.holderName}` : ''} • disponível {money(Math.max(card.limit-card.used,0))}</option>)}
      </select>

      <label>Descrição da compra</label>
      <input value={form.description} onChange={event=>setForm({...form,description:event.target.value})} placeholder="Ex.: Mercado, farmácia, tênis"/>

      <div className="form-row">
        <div><label>Valor total</label><input inputMode="decimal" value={form.amount} onChange={event=>setForm({...form,amount:event.target.value.replace(',','.')})} placeholder="0,00"/></div>
        <div><label>Data da compra</label><input type="date" value={form.purchaseDate} onChange={event=>setForm({...form,purchaseDate:event.target.value})}/></div>
      </div>

      <div className="form-row">
        <div><label>Categoria</label><select value={form.categoryId} onChange={event=>setForm({...form,categoryId:event.target.value})}><option value="">Sem categoria</option>{expenseCategories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
        <div><label>Parcelas</label><input type="number" min="1" max="48" value={form.installments} onChange={event=>setForm({...form,installments:event.target.value})}/></div>
      </div>

      {selectedCard&&<div className="card-purchase-info">
        <span>Fecha dia <b>{selectedCard.closingDay || '—'}</b></span>
        <span>Vence dia <b>{selectedCard.dueDay || '—'}</b></span>
        <span>1ª fatura <b>{firstDue ? new Date(firstDue+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</b></span>
      </div>}

      {total>0&&<div className="purchase-preview">
        <div className="purchase-preview-head"><b>Como ficará na fatura</b><span>{installmentCount}x • {money(total)}</span></div>
        {preview.map(item=><div key={item.n}><span>Parcela {item.n}/{installmentCount}</span><span>{item.due ? new Date(item.due+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span><b>{money(item.amount)}</b></div>)}
        {installmentCount>12&&<small>+ {installmentCount-12} parcela(s) futuras</small>}
      </div>}

      <div className="modal-user">Lançado por <b>{user.name}</b></div>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Lançar compra'}</button>
    </div>
  </div>
}


function BudgetModal({categories,budget,onClose,onSave}){
  const expenseCategories=categories.filter(cat=>['expense','both'].includes(cat.type))
  const [categoryId,setCategoryId]=useState(budget?.categoryId || expenseCategories[0]?.id || '')
  const [amount,setAmount]=useState(budget?.plannedAmount ? String(budget.plannedAmount) : '')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const save=async()=>{
    const value=Number(String(amount).replace(',','.'))
    if(!categoryId) return setError('Selecione uma categoria.')
    if(!(value>0)) return setError('Informe um valor maior que zero.')
    setBusy(true)
    setError('')
    try{
      await onSave({id:budget?.id || null,categoryId,plannedAmount:value})
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível salvar o orçamento.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-head"><h2>{budget?'Editar orçamento':'Definir orçamento'}</h2><button onClick={onClose}><X/></button></div>
      <label>Categoria</label>
      <select value={categoryId} onChange={event=>setCategoryId(event.target.value)} disabled={Boolean(budget)}>
        {expenseCategories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
      <label>Limite planejado para o mês</label>
      <input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value.replace(',','.'))} placeholder="0,00"/>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Salvar orçamento'}</button>
    </div>
  </div>
}

function GoalModal({user,onClose,onSave}){
  const [form,setForm]=useState({title:'',target:'',current:'0',dueDate:'',priority:'medium'})
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const save=async()=>{
    const target=Number(String(form.target).replace(',','.'))
    const current=Number(String(form.current).replace(',','.')) || 0
    if(!form.title.trim()) return setError('Informe o nome da meta.')
    if(!(target>0)) return setError('Informe o valor da meta.')
    if(current<0 || current>target) return setError('O valor atual deve estar entre zero e o valor da meta.')
    setBusy(true)
    setError('')
    try{
      await onSave({
        title:form.title.trim(),
        targetAmount:target,
        currentAmount:current,
        dueDate:form.dueDate || null,
        priority:form.priority,
        createdBy:user.id,
      })
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível criar a meta.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-head"><h2>Nova meta financeira</h2><button onClick={onClose}><X/></button></div>
      <label>Nome da meta</label>
      <input value={form.title} onChange={event=>setForm({...form,title:event.target.value})} placeholder="Ex.: Reserva de emergência"/>
      <div className="form-row">
        <div><label>Valor da meta</label><input inputMode="decimal" value={form.target} onChange={event=>setForm({...form,target:event.target.value.replace(',','.')})} placeholder="0,00"/></div>
        <div><label>Já guardado</label><input inputMode="decimal" value={form.current} onChange={event=>setForm({...form,current:event.target.value.replace(',','.')})} placeholder="0,00"/></div>
      </div>
      <div className="form-row">
        <div><label>Prazo <small className="label-help">(opcional)</small></label><input type="date" value={form.dueDate} onChange={event=>setForm({...form,dueDate:event.target.value})}/></div>
        <div><label>Prioridade</label><select value={form.priority} onChange={event=>setForm({...form,priority:event.target.value})}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></div>
      </div>
      <div className="modal-user">Criada por <b>{user.name}</b></div>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Criar meta'}</button>
    </div>
  </div>
}

function GoalProgressModal({goal,onClose,onSave}){
  const [current,setCurrent]=useState(String(goal.currentAmount||0))
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const target=Number(goal.targetAmount||0)

  const save=async()=>{
    const value=Number(String(current).replace(',','.'))
    if(value<0 || value>target) return setError(`Informe um valor entre ${money(0)} e ${money(target)}.`)
    setBusy(true)
    setError('')
    try{
      await onSave(goal,value)
      onClose()
    }catch(err){
      setError(err?.message || 'Não foi possível atualizar a meta.')
    }finally{
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-head"><h2>Atualizar meta</h2><button onClick={onClose}><X/></button></div>
      <div className="goal-edit-title"><b>{goal.title}</b><span>Objetivo: {money(target)}</span></div>
      <label>Valor acumulado até agora</label>
      <input inputMode="decimal" value={current} onChange={event=>setCurrent(event.target.value.replace(',','.'))}/>
      {error&&<div className="auth-msg">{error}</div>}
      <button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Atualizar progresso'}</button>
    </div>
  </div>
}


function BottomNav({page,setPage,onNew}){ return <nav className="bottom-nav"><button className={page==='dashboard'?'active':''} onClick={()=>setPage('dashboard')}><Home/><span>Início</span></button><button className={page==='receitas'?'active':''} onClick={()=>setPage('receitas')}><BarChart3/><span>Receitas</span></button><button className="fab" onClick={()=>onNew('despesa')}><Plus/></button><button className={page==='despesas'?'active':''} onClick={()=>setPage('despesas')}><TrendingDown/><span>Despesas</span></button><button className={['cartoes','planejamento','relatorios','config'].includes(page)?'active':''} onClick={()=>setPage('config')}><Settings/><span>Mais</span></button></nav> }

function App(){
  const [user,setUser]=useState(()=>getStore('cm_session',null))
  const [page,setPage]=useState('dashboard')
  const [expenses,setExpenses]=useState([])
  const [incomes,setIncomes]=useState([])
  const [cards,setCards]=useState([])
  const [categories,setCategories]=useState([])
  const [users,setUsers]=useState([])
  const [budgets,setBudgets]=useState([])
  const [goals,setGoals]=useState([])
  const [modal,setModal]=useState(null)
  const [loading,setLoading]=useState(!!user)
  const [loadError,setLoadError]=useState('')

  const loadData = async currentUser => {
    if (!currentUser?.token) {
      localStorage.removeItem('cm_session')
      setUser(null)
      return
    }

    setLoading(true)
    setLoadError('')
    try {
      const currentDate=new Date()
      const currentYear=currentDate.getFullYear()
      const currentMonth=currentDate.getMonth()+1
      const [validated, categoryRows, transactionRows, userRows, cardRows, budgetRows, goalRows] = await Promise.all([
        api.validate(currentUser.token),
        api.listCategories(currentUser.token),
        api.listTransactions(currentUser.token),
        api.listUsers(currentUser.token),
        api.listCards(currentUser.token),
        api.listBudgets(currentUser.token,currentYear,currentMonth),
        api.listGoals(currentUser.token),
      ])

      const profile = Array.isArray(validated) ? validated[0] : validated
      if (!profile?.user_id) throw new Error('Sua sessão expirou. Entre novamente.')

      const freshUser = {
        ...currentUser,
        id: profile.user_id,
        name: profile.user_name,
        role: profile.user_role,
        householdId: profile.household_id,
      }
      setUser(freshUser)
      setStore('cm_session', freshUser)

      const categoryMap = Object.fromEntries((categoryRows || []).map(cat=>[cat.id,cat]))
      const userMap = Object.fromEntries((userRows || []).map(item=>[item.id,item.name]))
      const uiTransactions = (transactionRows || []).map(tx=>txToUi(tx, categoryMap, userMap))
      setCategories(categoryRows || [])
      setUsers(userRows || [])
      setBudgets((budgetRows || []).map(row=>({
        id:row.id,
        year:Number(row.year),
        month:Number(row.month),
        categoryId:row.category_id,
        plannedAmount:Number(row.planned_amount||0),
      })))
      setGoals((goalRows || []).map(row=>({
        id:row.id,
        title:row.title,
        targetAmount:Number(row.target_amount||0),
        currentAmount:Number(row.current_amount||0),
        dueDate:row.due_date,
        status:row.status,
        priority:row.priority,
        createdBy:row.created_by,
      })))
      setIncomes(uiTransactions.filter(tx=>tx.type==='income'))
      setExpenses(uiTransactions.filter(tx=>tx.type==='expense'))

      const usageByCard = uiTransactions.filter(tx=>tx.type==='expense' && tx.cardId && tx.statusKey!=='paid' && tx.statusKey!=='cancelled').reduce((acc,tx)=>{
        acc[tx.cardId] = (acc[tx.cardId] || 0) + Number(tx.amount)
        return acc
      },{})

      setCards((cardRows || []).map(card=>({
        id:card.id,
        name:card.name,
        brand:card.brand || 'outro',
        color:card.color || '#175CD3',
        isActive:card.is_active !== false,
        holderUserId:card.holder_user_id || null,
        holderName:card.holder_user_id ? (userMap[card.holder_user_id] || 'Titular') : '',
        last4:card.last4,
        limit:Number(card.credit_limit || 0),
        used:Number(usageByCard[card.id] || 0),
        closingDay:Number(card.closing_day || 0),
        dueDay:Number(card.due_day || 0),
        close:card.closing_day ? String(card.closing_day).padStart(2,'0') : '—',
        due:card.due_day ? String(card.due_day).padStart(2,'0') : '—',
      })))
    } catch (err) {
      const message = err?.message || 'Não foi possível carregar os dados.'
      setLoadError(message)
      if (message.toLowerCase().includes('sessão') || message.toLowerCase().includes('session')) {
        localStorage.removeItem('cm_session')
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    if(user?.token) loadData(user)
  },[])

  const login = freshUser => {
    setUser(freshUser)
    setStore('cm_session', freshUser)
    loadData(freshUser)
  }

  const logout = async () => {
    try { if(user?.token) await api.logout(user.token) } catch {}
    localStorage.removeItem('cm_session')
    setUser(null)
    setExpenses([])
    setIncomes([])
    setCards([])
    setCategories([])
    setUsers([])
    setBudgets([])
    setGoals([])
  }

  if(!user) return <Auth onLogin={login}/>

  const addMonths = (iso,offset) => {
    const [year,month,day] = iso.split('-').map(Number)
    const base = new Date(Date.UTC(year,month-1+offset,1))
    const lastDay = new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate()
    const finalDay = Math.min(day,lastDay)
    const y = base.getUTCFullYear()
    const m = String(base.getUTCMonth()+1).padStart(2,'0')
    const d = String(finalDay).padStart(2,'0')
    return `${y}-${m}-${d}`
  }

  const saveTransaction = async (item,options={}) => {
    if (options.id) {
      await api.updateTransaction(user.token, options.id, item)
      await loadData(user)
      return
    }

    const base = {...item, household_id:user.householdId}

    if (options.kind==='Parcelada') {
      const total = Math.max(2,Number(options.totalInstallments || 2))
      const group = crypto.randomUUID()
      const rows = Array.from({length:total},(_,index)=>({
        ...base,
        description:`${base.description} ${index+1}/${total}`,
        status:index===0 ? base.status : 'pending',
        paid_date:index===0 ? base.paid_date : null,
        paid_by:index===0 ? base.paid_by : null,
        due_date:addMonths(base.due_date,index),
        transaction_date:addMonths(base.due_date,index),
        installment_group:group,
        installment_number:index+1,
        total_installments:total,
      }))
      await api.addTransaction(user.token, rows)
      await loadData(user)
      return
    }

    if (options.repeatFuture && ['Fixa','Recorrente'].includes(options.kind)) {
      if (!base.due_date) throw new Error('Informe o vencimento para gerar os próximos meses.')
      const rows = Array.from({length:12},(_,index)=>({
        ...base,
        status:index===0 ? base.status : 'pending',
        paid_date:index===0 ? base.paid_date : null,
        paid_by:index===0 ? base.paid_by : null,
        due_date:addMonths(base.due_date,index),
        transaction_date:addMonths(base.due_date,index),
        is_recurring:true,
        recurrence_day:Number(base.due_date.slice(-2)),
      }))
      await api.addTransaction(user.token, rows)
      await loadData(user)
      return
    }

    await api.addTransaction(user.token, base)
    await loadData(user)
  }

  const editTransaction = item => setModal({
    kind:'transaction',
    type:item.type==='income'?'receita':'despesa',
    item,
  })

  const deleteTransaction = async item => {
    if(!window.confirm(`Excluir “${item.desc}”? Esta ação não pode ser desfeita.`)) return
    await api.deleteTransaction(user.token,item.id)
    await loadData(user)
  }

  const toggleTransactionStatus = async item => {
    const isIncome = item.type==='income'
    const next = isIncome
      ? (item.statusKey==='received' ? 'pending' : 'received')
      : (item.statusKey==='paid' ? 'pending' : 'paid')

    await api.updateTransaction(user.token,item.id,{
      status:next,
      paid_date:['paid','received'].includes(next) ? localISODate() : null,
      paid_by:['paid','received'].includes(next) ? user.id : null,
    })
    await loadData(user)
  }

  const saveCard = async card => {
    const {id,created_by,...payload}=card
    if(id){
      await api.updateCard(user.token,id,payload)
    }else{
      await api.addCard(user.token, {
        ...payload,
        household_id:user.householdId,
        created_by:user.id,
      })
    }
    await loadData(user)
  }

  const saveCardPurchase = async purchase => {
    const count=Math.max(1,Number(purchase.installments||1))
    const totalCents=Math.round(Number(purchase.total||0)*100)
    const baseCents=Math.floor(totalCents/count)
    const remainder=totalCents-baseCents*count
    const group=count>1 ? crypto.randomUUID() : null

    const rows=Array.from({length:count},(_,index)=>{
      const amountCents=baseCents+(index===count-1?remainder:0)
      const dueDate=addMonths(purchase.firstDue,index)
      return {
        household_id:user.householdId,
        type:'expense',
        description:count>1 ? `${purchase.description} ${index+1}/${count}` : purchase.description,
        amount:amountCents/100,
        category_id:purchase.categoryId,
        card_id:purchase.card.id,
        kind:count>1?'installment':'card',
        status:'pending',
        transaction_date:dueDate,
        due_date:dueDate,
        payment_method:'Cartão',
        installment_group:group,
        installment_number:index+1,
        total_installments:count,
        merchant:purchase.description,
        notes:`Compra realizada em ${new Date(purchase.purchaseDate+'T12:00:00').toLocaleDateString('pt-BR')} no cartão ${purchase.card.name}`,
        source:'card',
      }
    })

    await api.addTransaction(user.token,rows)
    await loadData(user)
  }

  const payCardInvoice = async invoice => {
    await api.payCardInvoice(user.token,invoice.cardId,invoice.dueDate,{
      status:'paid',
      paid_date:localISODate(),
      paid_by:user.id,
    })
    await loadData(user)
  }

  const deleteCardPurchase = async purchase => {
    const parcelText=purchase.installments>1 ? ` Todas as ${purchase.installments} parcelas serão apagadas, inclusive as já pagas.` : ''
    if(!window.confirm(`Apagar a compra “${purchase.description}” no valor de ${money(purchase.amount)}?${parcelText} Esta ação não pode ser desfeita.`)) return
    if(purchase.installmentGroup){
      await api.removeCardPurchaseGroup(user.token,purchase.installmentGroup)
    }else if(purchase.itemId){
      await api.deleteTransaction(user.token,purchase.itemId)
    }
    await loadData(user)
  }

  const saveReceipt = async receipt => {
    const receiptRows = await api.addReceiptImport(user.token, {
      household_id:user.householdId,
      store_name:receipt.storeName,
      receipt_date:receipt.receiptDate,
      total_amount:Number(receipt.totalAmount || 0),
      status:'confirmed',
      created_by:user.id,
    })
    const receiptRow = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows
    if (!receiptRow?.id) throw new Error('Não foi possível criar o registro do cupom.')

    const itemRows = receipt.items.map(item=>({
      household_id:user.householdId,
      receipt_id:receiptRow.id,
      description:item.description,
      quantity:Number(item.quantity || 1),
      unit:item.unit || null,
      unit_price:Number(item.unitPrice || item.amount || 0),
      total_price:Number(item.amount),
      category_id:item.categoryId || null,
    }))

    await api.addReceiptItems(user.token,itemRows)

    const transactionRows = receipt.items.map(item=>({
      household_id:user.householdId,
      type:'expense',
      description:item.description,
      amount:Number(item.amount),
      category_id:item.categoryId || null,
      kind:'variable',
      status:'paid',
      transaction_date:receipt.receiptDate,
      due_date:receipt.receiptDate,
      paid_date:receipt.receiptDate,
      paid_by:user.id,
      merchant:receipt.storeName,
      source:'receipt',
    }))

    await api.addTransaction(user.token,transactionRows)
    await loadData(user)
  }

  const saveBudget = async data => {
    const now=new Date()
    const existing=data.id ? budgets.find(item=>item.id===data.id) : budgets.find(item=>item.categoryId===data.categoryId)
    if(existing){
      await api.updateBudget(user.token,existing.id,{planned_amount:data.plannedAmount})
    }else{
      await api.addBudget(user.token,{
        household_id:user.householdId,
        year:now.getFullYear(),
        month:now.getMonth()+1,
        category_id:data.categoryId,
        planned_amount:data.plannedAmount,
      })
    }
    await loadData(user)
  }

  const deleteBudget = async budget => {
    const category=categories.find(item=>item.id===budget.categoryId)?.name || budget.name || 'esta categoria'
    if(!window.confirm(`Apagar o orçamento de “${category}” deste mês? Esta ação não apaga as despesas lançadas.`)) return
    await api.deleteBudget(user.token,budget.id)
    await loadData(user)
  }

  const saveGoal = async data => {
    await api.addGoal(user.token,{
      household_id:user.householdId,
      title:data.title,
      target_amount:data.targetAmount,
      current_amount:data.currentAmount,
      due_date:data.dueDate,
      priority:data.priority,
      status:data.currentAmount>=data.targetAmount?'completed':'active',
      created_by:data.createdBy,
    })
    await loadData(user)
  }

  const updateGoalProgress = async (goal,value) => {
    await api.updateGoal(user.token,goal.id,{
      current_amount:value,
      status:value>=Number(goal.targetAmount||0)?'completed':'active',
    })
    await loadData(user)
  }

  const deleteGoal = async goal => {
    if(!window.confirm(`Excluir a meta “${goal.title}”? Esta ação não pode ser desfeita.`)) return
    await api.deleteGoal(user.token,goal.id)
    await loadData(user)
  }

  const saveCategory = async data => {
    if(data.id){
      await api.updateCategory(user.token,data.id,{
        name:data.name,
        type:data.type,
      })
    }else{
      await api.addCategory(user.token,{
        household_id:user.householdId,
        name:data.name,
        type:data.type,
        is_active:true,
      })
    }
    await loadData(user)
  }

  const changePin = async (currentPin,newPin) => {
    await api.changePin(user.token,currentPin,newPin)
  }

  const toggleUserActive = async target => {
    const action=target.is_active?'desativar':'ativar'
    if(!window.confirm('Deseja '+action+' o usuário '+target.name+'?')) return
    await api.setUserActive(user.token,target.id,!target.is_active)
    await loadData(user)
  }

  const toggleCardActive = async card => {
    const action=card.isActive ? 'desativar' : 'ativar'
    if(!window.confirm('Deseja '+action+' o cartão '+card.name+'? As compras já lançadas serão mantidas.')) return
    await api.updateCard(user.token,card.id,{is_active:!card.isActive})
    await loadData(user)
  }

  const downloadBackup = () => {
    const backup={
      app:'Carol & Marcos — Controle Financeiro',
      exportedAt:new Date().toISOString(),
      exportedBy:user.name,
      version:1,
      data:{
        incomes,
        expenses,
        cards,
        categories,
        budgets,
        goals,
        users:users.map(item=>({id:item.id,name:item.name,role:item.role,is_active:item.is_active})),
      },
    }
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url
    link.download='backup-controle-financeiro-'+localISODate()+'.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const rotateJoinCode = () => api.rotateJoinCode(user.token)
  const activeCards=cards.filter(card=>card.isActive!==false)

  let content
  if(loading) {
    content=<div className="loading-card"><div className="spinner"/><b>Sincronizando suas finanças...</b></div>
  } else if(loadError) {
    content=<div className="loading-card error-state"><b>Não foi possível sincronizar</b><p>{loadError}</p><button className="primary-btn compact" onClick={()=>loadData(user)}>Tentar novamente</button></div>
  } else {
    if(page==='dashboard') content=<Dashboard expenses={expenses} incomes={incomes} onView={item=>setModal({kind:'transactionView',item})}/>
    if(page==='receitas') content=<Receitas incomes={incomes} onNew={type=>setModal({kind:'transaction',type})} onEdit={editTransaction} onDelete={deleteTransaction} onToggle={toggleTransactionStatus}/>
    if(page==='despesas') content=<Despesas expenses={expenses} onNew={type=>setModal({kind:'transaction',type})} onReceipt={()=>setModal({kind:'receipt'})} onEdit={editTransaction} onDelete={deleteTransaction} onToggle={toggleTransactionStatus}/>
    if(page==='cartoes') content=<Cartoes cards={activeCards} expenses={expenses} onNew={()=>setModal({kind:'card'})} onPurchase={()=>setModal({kind:'cardPurchase'})} onPayInvoice={payCardInvoice} onDeletePurchase={deleteCardPurchase}/>
    if(page==='planejamento') content=<Planejamento expenses={expenses} incomes={incomes} categories={categories} budgets={budgets} goals={goals} onBudget={budget=>setModal({kind:'budget',budget:budget?.id?budget:null})} onBudgetDelete={deleteBudget} onGoal={()=>setModal({kind:'goal'})} onGoalProgress={goal=>setModal({kind:'goalProgress',goal})} onGoalDelete={deleteGoal}/>
    if(page==='relatorios') content=<Relatorios expenses={expenses} incomes={incomes}/>
    if(page==='config') content=<Config user={user} users={users} categories={categories} cards={cards} onLogout={logout} onRotateJoinCode={rotateJoinCode} onChangePin={()=>setModal({kind:'changePin'})} onNewCategory={()=>setModal({kind:'category'})} onEditCategory={category=>setModal({kind:'category',category})} onEditCard={card=>setModal({kind:'card',card})} onToggleCard={toggleCardActive} onToggleUser={toggleUserActive} onBackup={downloadBackup}/>
  }

  return <div className="app"><Sidebar page={page} setPage={setPage} user={user} onLogout={logout}/><main className="main"><Topbar user={user}/><div className="content">{content}</div></main><BottomNav page={page} setPage={setPage} onNew={type=>setModal({kind:'transaction',type})}/>{modal?.kind==='transaction' && <NewTransactionModal type={modal.type} item={modal.item} user={user} categories={categories} cards={activeCards} onClose={()=>setModal(null)} onSave={saveTransaction}/>} {modal?.kind==='transactionView' && <TransactionViewModal item={modal.item} cards={activeCards} onClose={()=>setModal(null)} onGoTo={target=>{setPage(target);setModal(null)}}/>} {modal?.kind==='card' && <NewCardModal user={user} users={users} card={modal.card} onClose={()=>setModal(null)} onSave={saveCard}/>} {modal?.kind==='category' && <CategoryModal category={modal.category} onClose={()=>setModal(null)} onSave={saveCategory}/>} {modal?.kind==='changePin' && <ChangePinModal onClose={()=>setModal(null)} onSave={changePin}/>} {modal?.kind==='cardPurchase' && <NewCardPurchaseModal user={user} cards={activeCards} categories={categories} onClose={()=>setModal(null)} onSave={saveCardPurchase}/>} {modal?.kind==='receipt' && <ReceiptImportModal user={user} categories={categories} onClose={()=>setModal(null)} onImport={saveReceipt}/>} {modal?.kind==='budget' && <BudgetModal categories={categories} budget={modal.budget} onClose={()=>setModal(null)} onSave={saveBudget}/>} {modal?.kind==='goal' && <GoalModal user={user} onClose={()=>setModal(null)} onSave={saveGoal}/>} {modal?.kind==='goalProgress' && <GoalProgressModal goal={modal.goal} onClose={()=>setModal(null)} onSave={updateGoalProgress}/>}</div>
}

createRoot(document.getElementById('root')).render(<App/>)
