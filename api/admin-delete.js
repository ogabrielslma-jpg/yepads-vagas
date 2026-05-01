// API que exclui um candidato (das tabelas candidaturas ou cadastros_completos).
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

  const { id, tabela } = req.body || {};

  if (!id || !tabela) {
    return res.status(400).json({ error: 'id e tabela são obrigatórios' });
  }

  // Whitelist de tabelas pra evitar injeção
  const tabelasPermitidas = ['candidaturas', 'cadastros_completos'];
  if (!tabelasPermitidas.includes(tabela)) {
    return res.status(400).json({ error: 'Tabela inválida' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Supabase:', errText);
      return res.status(500).json({ error: 'Erro ao excluir' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
