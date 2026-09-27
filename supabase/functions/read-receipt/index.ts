const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cm-session, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

async function validateFamilySession(req: Request) {
  const session = req.headers.get('x-cm-session') || ''
  if (!session) return false

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const publishableMap = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
  const publishableKey = publishableMap.default || Deno.env.get('SUPABASE_ANON_KEY') || ''
  if (!supabaseUrl || !publishableKey) return false

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/cm_validate_session`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
      'x-cm-session': session,
    },
    body: '{}',
  })

  if (!response.ok) return false
  const data = await response.json().catch(() => [])
  return Array.isArray(data) && data.length > 0 && Boolean(data[0]?.user_id)
}

const receiptSchema = {
  type: 'OBJECT',
  properties: {
    store_name: {
      type: 'STRING',
      description: 'Nome do estabelecimento exatamente como estiver legível no cupom.',
    },
    cnpj: {
      type: 'STRING',
      description: 'CNPJ do estabelecimento, somente se estiver legível. Caso contrário, string vazia.',
    },
    purchase_date: {
      type: 'STRING',
      description: 'Data da compra em YYYY-MM-DD. Caso não esteja legível, string vazia.',
    },
    total_amount: {
      type: 'NUMBER',
      description: 'Valor total final efetivamente pago no cupom.',
    },
    confidence: {
      type: 'NUMBER',
      description: 'Confiança geral da leitura, de 0 a 1.',
    },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: {
            type: 'STRING',
            description: 'Descrição do produto. Não invente nomes que não estejam visíveis.',
          },
          quantity: {
            type: 'NUMBER',
            description: 'Quantidade comprada. Use 1 quando não houver indicação legível.',
          },
          unit: {
            type: 'STRING',
            description: 'Unidade como UN, KG, LT, PCT, CX. Vazio quando não estiver legível.',
          },
          unit_price: {
            type: 'NUMBER',
            description: 'Preço unitário quando estiver legível; senão use o total do item.',
          },
          total_price: {
            type: 'NUMBER',
            description: 'Preço total da linha do produto.',
          },
          category_hint: {
            type: 'STRING',
            enum: ['Alimentação','Supermercado','Cuidado pessoal','Saúde','Roupa','Moradia','Outros'],
          },
          confidence: {
            type: 'NUMBER',
            description: 'Confiança da leitura deste item, de 0 a 1.',
          },
        },
        required: ['description','quantity','unit','unit_price','total_price','category_hint','confidence'],
      },
    },
  },
  required: ['store_name','cnpj','purchase_date','total_amount','confidence','items'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const valid = await validateFamilySession(req)
    if (!valid) return json({ error: 'Sessão inválida ou expirada.' }, 401)

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return json({ error: 'GEMINI_API_KEY não configurada no Supabase.' }, 500)

    const form = await req.formData()
    const image = form.get('image')
    if (!(image instanceof File)) return json({ error: 'Envie uma imagem no campo image.' }, 400)
    if (!image.type.startsWith('image/')) return json({ error: 'O arquivo enviado não é uma imagem.' }, 400)
    if (image.size > 8 * 1024 * 1024) return json({ error: 'A imagem deve ter no máximo 8 MB.' }, 413)

    const bytes = new Uint8Array(await image.arrayBuffer())
    const base64 = bytesToBase64(bytes)

    const prompt = `
Leia esta imagem de um cupom fiscal brasileiro/NFC-e como um conferente financeiro extremamente cuidadoso.

REGRAS OBRIGATÓRIAS:
1. Transcreva somente o que estiver realmente visível. NÃO invente nomes de produtos.
2. Separe todos os produtos comprados em items.
3. Não transforme linhas de CNPJ, impostos, tributos, pagamento, troco, subtotal ou total em produtos.
4. Para abreviações de supermercado, preserve a abreviação visível. Não tente adivinhar a marca completa.
5. Se uma descrição estiver parcialmente ilegível, escreva a melhor transcrição literal possível e reduza confidence.
6. total_price é o valor final daquela linha do produto.
7. total_amount é o total final pago na compra.
8. quantity deve refletir peso/quantidade quando estiver visível. Caso contrário, use 1.
9. Classifique category_hint apenas entre os valores permitidos pelo esquema.
10. Verifique visualmente se a soma dos itens é compatível com o total, mas NÃO altere valores apenas para fazê-los bater.
11. A data deve estar em YYYY-MM-DD.
12. Retorne todos os produtos que conseguir identificar, não apenas um resumo da compra.
`.trim()

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: image.type || 'image/jpeg', data: base64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: receiptSchema,
      },
    }

    const models = [
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-2.5-flash-lite',
    ]

    let payload: any = null
    let selectedModel = ''
    let lastError = 'Falha ao interpretar o cupom com IA.'

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const gemini = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
          },
        )

        const responsePayload = await gemini.json().catch(() => ({}))

        if (gemini.ok) {
          payload = responsePayload
          selectedModel = model
          break
        }

        lastError = responsePayload?.error?.message || `Erro ${gemini.status} no modelo ${model}.`

        const retryable = gemini.status === 429 || gemini.status === 500 || gemini.status === 503
        if (retryable && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 900))
          continue
        }
        break
      }
      if (payload) break
    }

    if (!payload) {
      return json({ error: lastError }, 503)
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: Record<string, unknown>) => typeof part.text === 'string' ? part.text : '')
      .join('')
      .trim()

    if (!text) return json({ error: 'A IA não retornou dados do cupom.' }, 502)

    const receipt = JSON.parse(text)
    if (!Array.isArray(receipt.items)) receipt.items = []

    receipt.items = receipt.items
      .filter((item: Record<string, unknown>) => Number(item.total_price) > 0 && String(item.description || '').trim())
      .map((item: Record<string, unknown>) => ({
        description: String(item.description || '').trim(),
        quantity: Number(item.quantity || 1),
        unit: String(item.unit || '').trim(),
        unit_price: Number(item.unit_price || item.total_price || 0),
        total_price: Number(item.total_price || 0),
        category_hint: String(item.category_hint || 'Supermercado'),
        confidence: Math.max(0, Math.min(1, Number(item.confidence || 0))),
      }))

    return json({
      provider: 'gemini',
      model: selectedModel,
      receipt,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado ao ler o cupom.' }, 500)
  }
})
