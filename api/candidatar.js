// API serverless do Vercel que recebe a candidatura e salva no Supabase.
// Variáveis de ambiente necessárias (configurar no painel do Vercel):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY  (use a "service_role" key, não a "anon")

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nome, email, whatsapp, vaga, link } = req.body || {};

  // Validação básica
  if (!nome || !email || !whatsapp || !vaga) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/candidaturas`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        vaga,
        link: link ? link.trim() : null,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase error:', errText);
      return res.status(500).json({ error: 'Erro ao salvar candidatura' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
