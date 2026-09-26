import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Home, TrendingUp, TrendingDown, CreditCard, Target, BarChart3, Settings,
  Plus, Bell, LogOut, Wallet, PiggyBank, Clock3, ReceiptText, UserRound,
  CalendarDays, ChevronRight, X, Save, Eye, EyeOff, CheckCircle2, Pencil, Trash2
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell
} from 'recharts'
import './styles.css'
import { api } from './api'

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
    installmentNumber: tx.installment_number,
    totalInstallments: tx.total_installments,
    isRecurring: tx.is_recurring,
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
  return <aside className="sidebar"><div className="sidebar-brand"><BarChart3/><div><b>Carol <span>&</span> Marcos</b><small>CONTROLE FINANCEIRO</small></div></div><nav>{items.map(([k,l,I])=><button key={k} className={page===k?'active':''} onClick={()=>setPage(k)}><I size={20}/><span>{l}</span></button>)}</nav><div className="sidebar-foot"><div className="user-dot">{user.name[0]?.toUpperCase()}</div><div><b>{user.name}</b><small>Usuário</small></div><button onClick={onLogout}><LogOut size={18}/></button></div></aside>
}

function Topbar({user}){ return <header className="topbar"><div className="top-date"><CalendarDays size={18}/> Setembro de 2026</div><Bell size={20}/><div className="avatar">{user.name[0]?.toUpperCase()}</div><b>{user.name}</b></header> }
function PageHead({title,subtitle,action}){ return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function Card({title,children}){ return <section className="card"><div className="card-title"><h3>{title}</h3></div>{children}</section> }

function getDisplayStatus(item){
  if (item.type === 'expense' && item.statusKey === 'pending' && item.dueDate) {
    const today = new Date().toISOString().slice(0,10)
    if (item.dueDate < today) return 'Em atraso'
  }
  return item.status || 'Pendente'
}

function StatusBadge({item}){
  const label = getDisplayStatus(item)
  const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-')
  return <span className={`status-badge status-${key}`}>{label}</span>
}

function TransactionList({rows=[],onEdit,onDelete,onToggle}){
  return <div className="list">{rows.length===0?<div className="empty">Nenhum lançamento.</div>:rows.map(r=><div className="list-row transaction-row" key={`${r.type||''}-${r.id}-${r.desc}`}>
    <div className={`mini-icon ${r.type==='income'||r.type==='in'?'income':'expense'}`}>{r.type==='income'||r.type==='in'?<TrendingUp size={18}/>:<ReceiptText size={18}/>}</div>
    <div className="grow"><b>{r.desc}</b><small>{r.category || r.kind || 'Lançamento'} {r.by ? `• por ${r.by}` : ''}{r.dueDate ? ` • vence ${new Date(r.dueDate+'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</small></div>
    {r.statusKey && <StatusBadge item={r}/>}
    <strong className={r.type==='income'||r.type==='in'?'good':'bad'}>{r.type==='income'||r.type==='in'?'+ ':'- '}{money(r.amount)}</strong>
    {(onEdit||onDelete||onToggle) && <div className="row-actions">
      {onToggle && <button title="Alterar situação" onClick={()=>onToggle(r)}><CheckCircle2 size={17}/></button>}
      {onEdit && <button title="Editar" onClick={()=>onEdit(r)}><Pencil size={17}/></button>}
      {onDelete && <button className="danger-action" title="Excluir" onClick={()=>onDelete(r)}><Trash2 size={17}/></button>}
    </div>}
  </div>)}</div>
}

function List({rows=[]}){ return <TransactionList rows={rows}/> }

function Dashboard({expenses,incomes}){
  const income = incomes.reduce((s,x)=>s+Number(x.amount),0)
  const received = incomes.filter(x=>x.statusKey==='received').reduce((s,x)=>s+Number(x.amount),0)
  const spent = expenses.filter(x=>x.statusKey==='paid').reduce((s,x)=>s+Number(x.amount),0)
  const pending = expenses.filter(x=>x.statusKey!=='paid' && x.statusKey!=='cancelled').reduce((s,x)=>s+Number(x.amount),0)
  const balance = received-spent
  const byCat = Object.entries(expenses.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).map(([name,value])=>({name,value}))
  const monthly = [{m:'Abr',r:7800,d:6900},{m:'Mai',r:8200,d:7100},{m:'Jun',r:9000,d:7600},{m:'Jul',r:9200,d:7900},{m:'Ago',r:8500,d:7400},{m:'Set',r:income,d:spent}]
  return <><PageHead title="Olá!" subtitle="Acompanhe o resumo financeiro do mês."/><div className="stats-grid"><Stat icon={TrendingUp} label="Renda prevista" value={money(income)} tone="green" sub="Setembro"/><Stat icon={CheckCircle2} label="Renda recebida" value={money(received)} tone="green" sub={`${Math.round((received/Math.max(income,1))*100 || 0)}% da prevista`}/><Stat icon={TrendingDown} label="Despesas pagas" value={money(spent)} tone="red" sub={`${Math.round((spent/Math.max(received,1))*100 || 0)}% do recebido`}/><Stat icon={Clock3} label="A pagar" value={money(pending)} tone="orange" sub={pending ? 'Contas pendentes' : 'Tudo em dia'}/><Stat icon={Wallet} label="Saldo atual" value={money(balance)} tone="blue" sub="Saldo do mês"/><Stat icon={PiggyBank} label="Disponível para investir" value={money(Math.max(balance,0)*0.08)} tone="green" sub="Meta sugerida"/></div><div className="two-col"><Card title="Receitas x Despesas"><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><XAxis dataKey="m"/><YAxis/><Tooltip formatter={v=>money(v)}/><Bar dataKey="r" fill="#14b87a" radius={[6,6,0,0]}/><Bar dataKey="d" fill="#1368ff" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card><Card title="Despesas por categoria"><div className="pie-wrap"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={1}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,6).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div></Card></div><div className="two-col"><Card title="Últimas movimentações"><List rows={[...incomes.map(x=>({...x,type:'in'})),...expenses.map(x=>({...x,type:'out'}))].slice(-6).reverse()}/></Card><Card title="Contas a vencer"><List rows={expenses.slice(0,5).map(x=>({...x,type:'out'}))}/></Card></div></>
}

function Receitas({incomes,onNew,onEdit,onDelete,onToggle}){
  const total = incomes.reduce((s,x)=>s+Number(x.amount),0)
  const received = incomes.filter(x=>x.statusKey==='received').reduce((s,x)=>s+Number(x.amount),0)
  const pending = incomes.filter(x=>x.statusKey!=='received' && x.statusKey!=='cancelled').reduce((s,x)=>s+Number(x.amount),0)
  const extra = incomes.filter(x=>x.kind==='Extra').reduce((s,x)=>s+Number(x.amount),0)
  return <><PageHead title="Receitas" subtitle="Controle de rendas e recebimentos." action={<button className="primary-btn compact" onClick={()=>onNew('receita')}><Plus size={18}/> Nova receita</button>}/><div className="stats-grid four"><Stat icon={PiggyBank} label="Renda prevista" value={money(total)} tone="green"/><Stat icon={CheckCircle2} label="Renda recebida" value={money(received)} tone="green"/><Stat icon={Plus} label="Renda extra" value={money(extra)}/><Stat icon={Clock3} label="Pendente" value={money(pending)} tone="orange"/></div><div className="two-col split-wide"><Card title="Receitas recorrentes"><TransactionList rows={incomes.filter(x=>x.kind==='Recorrente')} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card><Card title="Receitas extras"><TransactionList rows={incomes.filter(x=>x.kind==='Extra')} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card></div></>
}
function Despesas({expenses,onNew,onEdit,onDelete,onToggle}){
  const paid = expenses.filter(x=>x.statusKey==='paid').reduce((s,x)=>s+Number(x.amount),0)
  const pendingRows = expenses.filter(x=>x.statusKey!=='paid' && x.statusKey!=='cancelled')
  const pending = pendingRows.filter(x=>getDisplayStatus(x)!=='Em atraso').reduce((s,x)=>s+Number(x.amount),0)
  const overdue = pendingRows.filter(x=>getDisplayStatus(x)==='Em atraso').reduce((s,x)=>s+Number(x.amount),0)
  const total = expenses.filter(x=>x.statusKey!=='cancelled').reduce((s,x)=>s+Number(x.amount),0)
  const byCat=Object.entries(expenses.filter(x=>x.statusKey!=='cancelled').reduce((a,x)=>{a[x.category]=(a[x.category]||0)+Number(x.amount);return a},{})).map(([name,value])=>({name,value}))
  return <><PageHead title="Despesas" subtitle="Controle e acompanhamento dos seus gastos." action={<button className="primary-btn compact" onClick={()=>onNew('despesa')}><Plus size={18}/> Nova despesa</button>}/><div className="stats-grid four"><Stat icon={CreditCard} label="Despesas pagas" value={money(paid)} tone="red"/><Stat icon={Clock3} label="A pagar" value={money(pending)} tone="orange"/><Stat icon={TrendingDown} label="Em atraso" value={money(overdue)} tone="red"/><Stat icon={Target} label="Total previsto" value={money(total)} tone="blue"/></div><div className="two-col split-wide"><Card title="Despesas do mês"><TransactionList rows={expenses} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}/></Card><Card title="Despesas por categoria"><div className="pie-wrap vertical"><div className="pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={byCat} dataKey="value" innerRadius={55} outerRadius={82}>{byCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)}/></PieChart></ResponsiveContainer></div><div className="legend">{byCat.slice(0,8).map((x,i)=><div key={x.name}><span style={{background:COLORS[i%COLORS.length]}}></span><b>{x.name}</b><em>{money(x.value)}</em></div>)}</div></div></Card></div></>
}
function Cartoes({cards,onNew}){
  const totalLimit=cards.reduce((s,c)=>s+c.limit,0), used=cards.reduce((s,c)=>s+c.used,0)
  return <><PageHead title="Cartões" subtitle="Controle de cartões, compras e faturas." action={<button className="primary-btn compact" onClick={()=>onNew('card')}><Plus size={18}/> Novo cartão</button>}/><div className="stats-grid four"><Stat icon={CreditCard} label="Limite total" value={money(totalLimit)}/><Stat icon={Wallet} label="Disponível" value={money(totalLimit-used)} tone="green"/><Stat icon={ReceiptText} label="Fatura atual" value={money(used)} tone="red"/><Stat icon={CalendarDays} label="Próximo vencimento" value={cards[0]?.due || '—'} tone="orange"/></div><Card title="Meus cartões">{cards.length ? <div className="credit-cards">{cards.map((card,i)=><div className={`credit-card cc${(i%3)+1}`} key={card.id}><small>Carol & Marcos</small><h3>{card.name}</h3><div className="cc-number">•••• {card.last4 || '0000'}</div><div className="cc-bottom"><span>Limite<br/><b>{money(card.limit)}</b></span><span>Disponível<br/><b>{money(Math.max(card.limit-card.used,0))}</b></span></div></div>)}</div> : <div className="empty">Nenhum cartão cadastrado. Clique em “Novo cartão”.</div>}</Card><div className="two-col"><Card title="Próximas faturas"><List rows={cards.map(card=>({id:card.id,desc:card.name,amount:card.used,category:`Vence ${card.due || '—'}`,type:'out'}))}/></Card><Card title="Parcelamentos ativos"><div className="empty">Os parcelamentos serão exibidos aqui quando forem cadastrados nas despesas.</div></Card></div></>
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

function Config({user,users,onLogout,onRotateJoinCode}){
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

  return <><PageHead title="Configurações" subtitle="Personalize o sistema, usuários e preferências."/><div className="two-col split-wide"><Card title="Usuários do sistema"><div className="list">{users.map(u=><div className="list-row" key={u.id}><div className="avatar">{u.name[0].toUpperCase()}</div><div className="grow"><b>{u.name}</b><small>{u.role === 'admin' ? 'Administrador' : 'Usuário da família'}</small></div><span className="pill">{u.is_active ? 'Ativo' : 'Inativo'}</span></div>)}</div></Card><Card title="Perfil da família"><div className="settings-text"><b>Carol & Marcos — Controle Financeiro</b><p>Controle financeiro compartilhado da família.</p><p>Usuário atual: <strong>{user.name}</strong></p>{user.role==='admin' && <div className="family-code"><span>Código para cadastrar o segundo usuário</span><strong>{familyCode || 'Gere um novo código'}</strong><button className="secondary-btn" onClick={rotate} disabled={rotating}>{rotating?'Gerando...':'Gerar novo código'}</button></div>}</div></Card></div><div className="two-col split-wide"><Card title="Segurança e acesso"><div className="settings-text"><p>✓ PIN armazenado com hash no banco</p><p>✓ Bloqueio temporário após tentativas incorretas</p><p>✓ Dados separados por família com políticas RLS</p><p className="warning">Evite usar o sistema em computadores públicos. A sessão fica salva neste navegador para facilitar o acesso.</p></div></Card><Card title="Backup e exportação"><div className="settings-text"><p>Os lançamentos agora ficam sincronizados no Supabase entre celular e computador.</p><button className="secondary-btn" onClick={onLogout}><LogOut size={18}/> Sair da conta</button></div></Card></div></>
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
        transaction_date:item?.date || new Date().toISOString().slice(0,10),
        due_date:form.dueDate || null,
        paid_date:['paid','received'].includes(form.status) ? new Date().toISOString().slice(0,10) : null,
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

function NewCardModal({user,onClose,onSave}){
  const [form,setForm] = useState({name:'',last4:'',limit:'',closingDay:'',dueDay:''})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')

  const save = async () => {
    setError('')
    if (!form.name.trim()) return setError('Informe o nome do cartão.')
    if (!Number(form.limit)) return setError('Informe o limite do cartão.')
    setBusy(true)
    try {
      await onSave({
        name: form.name.trim(),
        last4: form.last4.replace(/\D/g,'').slice(-4) || null,
        credit_limit: Number(form.limit),
        closing_day: form.closingDay ? Number(form.closingDay) : null,
        due_day: form.dueDay ? Number(form.dueDay) : null,
        created_by: user.id,
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Não foi possível cadastrar o cartão.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><h2>Novo cartão</h2><button onClick={onClose}><X/></button></div><label>Nome do cartão</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Nubank"/><label>Últimos 4 dígitos <small className="label-help">(opcional)</small></label><input inputMode="numeric" maxLength={4} value={form.last4} onChange={e=>setForm({...form,last4:e.target.value.replace(/\D/g,'')})} placeholder="1234"/><label>Limite</label><input inputMode="decimal" value={form.limit} onChange={e=>setForm({...form,limit:e.target.value.replace(',','.')})} placeholder="0,00"/><div className="form-row"><div><label>Dia do fechamento</label><input inputMode="numeric" maxLength={2} value={form.closingDay} onChange={e=>setForm({...form,closingDay:e.target.value.replace(/\D/g,'')})}/></div><div><label>Dia do vencimento</label><input inputMode="numeric" maxLength={2} value={form.dueDay} onChange={e=>setForm({...form,dueDay:e.target.value.replace(/\D/g,'')})}/></div></div>{error&&<div className="auth-msg">{error}</div>}<button className="primary-btn" disabled={busy} onClick={save}><Save size={18}/> {busy?'Salvando...':'Cadastrar cartão'}</button></div></div>
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
      const [validated, categoryRows, transactionRows, userRows, cardRows] = await Promise.all([
        api.validate(currentUser.token),
        api.listCategories(currentUser.token),
        api.listTransactions(currentUser.token),
        api.listUsers(currentUser.token),
        api.listCards(currentUser.token),
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
      setIncomes(uiTransactions.filter(tx=>tx.type==='income'))
      setExpenses(uiTransactions.filter(tx=>tx.type==='expense'))

      const usageByCard = uiTransactions.filter(tx=>tx.type==='expense' && tx.cardId && tx.statusKey!=='cancelled').reduce((acc,tx)=>{
        acc[tx.cardId] = (acc[tx.cardId] || 0) + Number(tx.amount)
        return acc
      },{})

      setCards((cardRows || []).map(card=>({
        id:card.id,
        name:card.name,
        last4:card.last4,
        limit:Number(card.credit_limit || 0),
        used:Number(usageByCard[card.id] || 0),
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
      paid_date:['paid','received'].includes(next) ? new Date().toISOString().slice(0,10) : null,
      paid_by:['paid','received'].includes(next) ? user.id : null,
    })
    await loadData(user)
  }

  const saveCard = async card => {
    await api.addCard(user.token, {
      ...card,
      household_id:user.householdId,
    })
    await loadData(user)
  }

  const rotateJoinCode = () => api.rotateJoinCode(user.token)

  let content
  if(loading) {
    content=<div className="loading-card"><div className="spinner"/><b>Sincronizando suas finanças...</b></div>
  } else if(loadError) {
    content=<div className="loading-card error-state"><b>Não foi possível sincronizar</b><p>{loadError}</p><button className="primary-btn compact" onClick={()=>loadData(user)}>Tentar novamente</button></div>
  } else {
    if(page==='dashboard') content=<Dashboard expenses={expenses} incomes={incomes}/>
    if(page==='receitas') content=<Receitas incomes={incomes} onNew={type=>setModal({kind:'transaction',type})} onEdit={editTransaction} onDelete={deleteTransaction} onToggle={toggleTransactionStatus}/>
    if(page==='despesas') content=<Despesas expenses={expenses} onNew={type=>setModal({kind:'transaction',type})} onEdit={editTransaction} onDelete={deleteTransaction} onToggle={toggleTransactionStatus}/>
    if(page==='cartoes') content=<Cartoes cards={cards} onNew={()=>setModal({kind:'card'})}/>
    if(page==='planejamento') content=<Planejamento expenses={expenses} incomes={incomes}/>
    if(page==='relatorios') content=<Relatorios expenses={expenses} incomes={incomes}/>
    if(page==='config') content=<Config user={user} users={users} onLogout={logout} onRotateJoinCode={rotateJoinCode}/>
  }

  return <div className="app"><Sidebar page={page} setPage={setPage} user={user} onLogout={logout}/><main className="main"><Topbar user={user}/><div className="content">{content}</div></main><BottomNav page={page} setPage={setPage} onNew={type=>setModal({kind:'transaction',type})}/>{modal?.kind==='transaction' && <NewTransactionModal type={modal.type} item={modal.item} user={user} categories={categories} cards={cards} onClose={()=>setModal(null)} onSave={saveTransaction}/>} {modal?.kind==='card' && <NewCardModal user={user} onClose={()=>setModal(null)} onSave={saveCard}/>}</div>
}

createRoot(document.getElementById('root')).render(<App/>)
