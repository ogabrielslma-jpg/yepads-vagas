// API que retorna todos os candidatos das duas tabelas pro painel admin.
// Protegida por senha simples (header X-Admin-Password).
//
// Variáveis de ambiente necessárias:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY
//   - ADMIN_PASSWORD (senha pra acessar o painel)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Senha pode vir do header OU do body (POST), pra simplificar o login
  const senhaCliente = req.headers['x-admin-password'] || (req.body && req.body.senha);
  const senhaCorreta = process.env.ADMIN_PASSWORD;

  if (!senhaCorreta) {
    console.error('ADMIN_PASSWORD não configurada');
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  if (senhaCliente !== senhaCorreta) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase env vars não configuradas');
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    // Busca as duas tabelas em paralelo
    const [resCandidaturas, resCompletos] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/candidaturas?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/cadastros_completos?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
    ]);

    if (!resCandidaturas.ok || !resCompletos.ok) {
      const errText = await resCandidaturas.text();
      console.error('Erro Supabase:', errText);
      return res.status(500).json({ error: 'Erro ao buscar dados' });
    }

    const candidaturas = await resCandidaturas.json();
    const completos = await resCompletos.json();

    // Marca origem em cada um pra UI saber qual tabela
    const candidaturasMarcadas = candidaturas.map(c => ({ ...c, origem: 'candidatura' }));
    const completosMarcados = completos.map(c => ({ ...c, origem: 'completo' }));

    return res.status(200).json({
      candidaturas: candidaturasMarcadas,
      completos: completosMarcados,
      stats: {
        total: candidaturasMarcadas.length + completosMarcados.length,
        candidaturas: candidaturasMarcadas.length,
        completos: completosMarcados.length
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
