// Gera uma URL temporária assinada (1h) pra abrir um arquivo do bucket privado "documentos".
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

  const { path } = req.body || {};

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path é obrigatório' });
  }

  // Sanitização: não pode ter "..", começar com "/", e tem que estar dentro de uma pasta
  if (path.includes('..') || path.startsWith('/') || !path.includes('/')) {
    return res.status(400).json({ error: 'path inválido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    // Cria URL assinada que expira em 3600 segundos (1h)
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/documentos/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresIn: 3600 })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Supabase sign:', errText);
      return res.status(500).json({ error: 'Erro ao gerar URL' });
    }

    const data = await response.json();
    // data.signedURL vem como "/object/sign/documentos/...?token=..."
    // precisamos prefixar com SUPABASE_URL/storage/v1
    const signedURL = data.signedURL || data.signedUrl;
    const fullUrl = signedURL.startsWith('http')
      ? signedURL
      : `${SUPABASE_URL}/storage/v1${signedURL}`;

    return res.status(200).json({ url: fullUrl });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
