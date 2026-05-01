// API que atualiza status e notas de um candidato.
// Protegida por senha simples (header X-Admin-Password).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const senhaCliente = req.headers['x-admin-password'];
  const senhaCorreta = process.env.ADMIN_PASSWORD;

  if (!senhaCorreta) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  if (senhaCliente !== senhaCorreta) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const { id, tabela, status, notas } = req.body || {};

  if (!id || !tabela) {
    return res.status(400).json({ error: 'id e tabela são obrigatórios' });
  }

  // Whitelist de tabelas pra evitar injeção
  const tabelasPermitidas = ['candidaturas', 'cadastros_completos'];
  if (!tabelasPermitidas.includes(tabela)) {
    return res.status(400).json({ error: 'Tabela inválida' });
  }

  // Whitelist de status
  const statusPermitidos = ['novo', 'contatado', 'em_processo', 'aprovado', 'rejeitado'];
  if (status && !statusPermitidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    // Monta payload de update apenas com campos enviados
    const updates = { atualizado_em: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notas !== undefined) updates.notas = notas;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Supabase:', errText);
      return res.status(500).json({ error: 'Erro ao atualizar' });
    }

    const data = await response.json();
    return res.status(200).json({ ok: true, data: data[0] });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
