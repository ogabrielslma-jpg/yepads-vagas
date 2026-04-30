// API serverless: recebe cadastro completo e salva no Supabase.
// Variáveis de ambiente necessárias (já configuradas no Vercel):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const {
    nome_completo, data_nascimento, cpf, email, whatsapp,
    cidade, estado, linkedin,
    vaga,
    formacao_nivel, formacao_status, formacao_detalhe,
    disponibilidade_inicio, carga_horaria, estrutura, pretensao_salarial,
    motivacao, experiencia_dificil, observacoes,
    experiencias
  } = body;

  // Validação básica dos campos obrigatórios
  const obrigatorios = { nome_completo, email, whatsapp, cpf, vaga, motivacao };
  for (const [key, val] of Object.entries(obrigatorios)) {
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return res.status(400).json({ error: `Campo obrigatório faltando: ${key}` });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase env vars não configuradas');
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cadastros_completos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nome_completo: nome_completo.trim(),
        data_nascimento: data_nascimento || null,
        cpf: cpf.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        cidade: cidade || null,
        estado: estado || null,
        linkedin: linkedin || null,
        vaga,
        formacao_nivel: formacao_nivel || null,
        formacao_status: formacao_status || null,
        formacao_detalhe: formacao_detalhe || null,
        disponibilidade_inicio: disponibilidade_inicio || null,
        carga_horaria: carga_horaria || null,
        estrutura: estrutura || [],
        pretensao_salarial: pretensao_salarial || null,
        motivacao: motivacao.trim(),
        experiencia_dificil: experiencia_dificil || null,
        observacoes: observacoes || null,
        experiencias: experiencias || [],
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase error:', errText);
      return res.status(500).json({ error: 'Erro ao salvar cadastro' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
