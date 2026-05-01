// API que marca uma etapa do funil como concluída (timestamp)
// e/ou salva info da entrevista (horário + quem).
// Protegida por senha admin.

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

  const { id, tabela, etapa, entrevista_horario, entrevista_quem, desfazer } = req.body || {};

  if (!id || !tabela) {
    return res.status(400).json({ error: 'id e tabela são obrigatórios' });
  }

  const tabelasPermitidas = ['candidaturas', 'cadastros_completos'];
  if (!tabelasPermitidas.includes(tabela)) {
    return res.status(400).json({ error: 'Tabela inválida' });
  }

  const etapasPermitidas = [1, 2, 3, 4, 5];
  if (etapa !== undefined && !etapasPermitidas.includes(etapa)) {
    return res.status(400).json({ error: 'Etapa inválida' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    const updates = { atualizado_em: new Date().toISOString() };

    if (etapa) {
      const campo = `etapa${etapa}_em`;
      updates[campo] = desfazer ? null : new Date().toISOString();
    }
    if (entrevista_horario !== undefined) updates.entrevista_horario = entrevista_horario;
    if (entrevista_quem !== undefined) updates.entrevista_quem = entrevista_quem;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${encodeURIComponent(id)}`,
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
