const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://cmnvdhettoxyejisfqdl.supabase.co').replace(/\/+$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_p8pVnRJruwlrIfnhFUas1g_oGj6B0Sr'

async function request(path, { method = 'GET', body, session, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
  }
  if (session) headers['x-cm-session'] = session
  if (prefer) headers.Prefer = prefer

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const raw = await response.text()
  let data = null
  if (raw) {
    try { data = JSON.parse(raw) } catch { data = raw }
  }

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.hint || `Erro ${response.status}`
    throw new Error(message)
  }

  return data
}

const rpc = (name, body = {}, session) =>
  request(`rpc/${name}`, { method: 'POST', body, session })

async function readReceiptAI(session, imageBlob) {
  const form = new FormData()
  const filename = imageBlob?.name || 'cupom.jpg'
  form.append('image', imageBlob, filename)

  const response = await fetch(`${SUPABASE_URL}/functions/v1/read-receipt`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'x-cm-session': session,
    },
    body: form,
  })

  const raw = await response.text()
  let data = null
  if (raw) {
    try { data = JSON.parse(raw) } catch { data = raw }
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Erro ${response.status} ao ler o cupom.`)
  }
  return data
}

export const api = {
  register: (name, pin, joinCode) =>
    rpc('cm_register_user', {
      p_name: name,
      p_pin: pin,
      p_join_code: joinCode || null,
    }),

  login: (name, pin) =>
    rpc('cm_login', { p_name: name, p_pin: pin }),

  validate: session =>
    rpc('cm_validate_session', {}, session),

  logout: session =>
    rpc('cm_logout', {}, session),

  listUsers: session =>
    rpc('cm_list_users', {}, session),

  rotateJoinCode: session =>
    rpc('cm_rotate_join_code', {}, session),

  changePin: (session, currentPin, newPin) =>
    rpc('cm_change_pin', {
      p_current_pin: currentPin,
      p_new_pin: newPin,
    }, session),

  listCategories: session =>
    request('categories?select=id,name,type,icon,color,is_active&is_active=eq.true&order=name.asc', { session }),

  listTransactions: session =>
    request('transactions?select=id,type,description,amount,category_id,card_id,kind,status,transaction_date,due_date,paid_date,payment_method,installment_group,installment_number,total_installments,is_recurring,merchant,notes,source,created_by,paid_by,created_at&order=transaction_date.desc,created_at.desc', { session }),

  addTransaction: (session, transaction) =>
    request('transactions', {
      method: 'POST',
      body: transaction,
      session,
      prefer: 'return=representation,missing=default',
    }),

  updateTransaction: (session, id, patch) =>
    request(`transactions?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
      session,
      prefer: 'return=representation',
    }),

  deleteTransaction: (session, id) =>
    request(`transactions?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      session,
    }),

  listCards: session =>
    request('credit_cards?select=id,name,brand,last4,credit_limit,closing_day,due_day,color,is_active,created_by,created_at&is_active=eq.true&order=created_at.asc', { session }),

  addCard: (session, card) =>
    request('credit_cards', {
      method: 'POST',
      body: card,
      session,
      prefer: 'return=representation',
    }),

  updateCard: (session, id, patch) =>
    request(`credit_cards?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
      session,
      prefer: 'return=representation',
    }),

  payCardInvoice: (session, cardId, dueDate, patch) =>
    request(`transactions?card_id=eq.${encodeURIComponent(cardId)}&due_date=eq.${encodeURIComponent(dueDate)}&status=neq.cancelled`, {
      method: 'PATCH',
      body: patch,
      session,
      prefer: 'return=representation',
    }),

  listGoals: session =>
    request('goals?select=id,title,target_amount,current_amount,due_date,status,priority,created_by,created_at&order=created_at.desc', { session }),

  addGoal: (session, goal) =>
    request('goals', {
      method: 'POST',
      body: goal,
      session,
      prefer: 'return=representation,missing=default',
    }),

  updateGoal: (session, id, patch) =>
    request(`goals?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
      session,
      prefer: 'return=representation',
    }),

  deleteGoal: (session, id) =>
    request(`goals?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      session,
    }),

  listBudgets: (session, year, month) =>
    request(`monthly_budgets?select=id,year,month,category_id,planned_amount,created_at,updated_at&year=eq.${encodeURIComponent(year)}&month=eq.${encodeURIComponent(month)}&order=created_at.asc`, { session }),

  addBudget: (session, budget) =>
    request('monthly_budgets', {
      method: 'POST',
      body: budget,
      session,
      prefer: 'return=representation,missing=default',
    }),

  updateBudget: (session, id, patch) =>
    request(`monthly_budgets?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
      session,
      prefer: 'return=representation',
    }),

  deleteBudget: (session, id) =>
    request(`monthly_budgets?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      session,
    }),

  addReceiptImport: (session, receipt) =>
    request('receipt_imports', {
      method: 'POST',
      body: receipt,
      session,
      prefer: 'return=representation,missing=default',
    }),

  addReceiptItems: (session, items) =>
    request('receipt_items', {
      method: 'POST',
      body: items,
      session,
      prefer: 'return=representation,missing=default',
    }),

  readReceiptAI,
}

export { SUPABASE_URL }
