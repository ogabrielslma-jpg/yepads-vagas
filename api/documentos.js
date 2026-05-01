// API que recebe os documentos enviados pelos candidatos via /documentos.
// Salva os arquivos no Supabase Storage e cria registro na tabela documentos_candidatos.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    nome, email, whatsapp,
    rg_base64, cpf_cnh_base64, comprovante_base64,
    rg_filename, cpf_cnh_filename, comprovante_filename,
    dados_verdadeiros, autorizacao_consulta, observacoes
  } = req.body || {};

  // Validação básica
  if (!nome || !email || !whatsapp) {
    return res.status(400).json({ error: 'Nome, email e WhatsApp são obrigatórios' });
  }
  if (!rg_base64 || !cpf_cnh_base64 || !comprovante_base64) {
    return res.status(400).json({ error: 'Todos os documentos são obrigatórios' });
  }
  if (!dados_verdadeiros || !autorizacao_consulta) {
    return res.status(400).json({ error: 'Você precisa confirmar os dois checkboxes' });
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
    // Sanitiza identificador do candidato pra usar como pasta
    const slug = (email || whatsapp || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    const timestamp = Date.now();
    const baseFolder = `${slug}-${timestamp}`;

    // Função pra fazer upload de um arquivo base64 pro Storage
    async function uploadFile(base64Data, filename, fileLabel) {
      // Remove o prefixo "data:image/png;base64," se existir
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Detecta extensão pelo prefixo do data URL ou usa .jpg
      let ext = '.jpg';
      const mimeMatch = base64Data.match(/^data:([^;]+);base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('pdf')) ext = '.pdf';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';

      const safeFilename = `${fileLabel}${ext}`;
      const path = `${baseFolder}/${safeFilename}`;

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/documentos/${path}`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': mime,
            'x-upsert': 'true'
          },
          body: buffer
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error(`Erro upload ${fileLabel}:`, errText);
        throw new Error(`Falha no upload de ${fileLabel}`);
      }

      // URL assinada (temporária, expira em 7 dias)
      // Como o bucket é privado, vamos só guardar o path
      return path;
    }

    const [rgPath, cpfCnhPath, comprovantePath] = await Promise.all([
      uploadFile(rg_base64, rg_filename, 'rg'),
      uploadFile(cpf_cnh_base64, cpf_cnh_filename, 'cpf-cnh'),
      uploadFile(comprovante_base64, comprovante_filename, 'comprovante')
    ]);

    // Salva no banco
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/documentos_candidatos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        candidato_nome: nome,
        candidato_email: email,
        candidato_whatsapp: whatsapp,
        rg_url: rgPath,
        cpf_cnh_url: cpfCnhPath,
        comprovante_residencia_url: comprovantePath,
        dados_verdadeiros: !!dados_verdadeiros,
        autorizacao_consulta: !!autorizacao_consulta,
        observacoes: observacoes || ''
      })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('Erro insert:', errText);
      return res.status(500).json({ error: 'Documentos enviados mas falhou ao registrar. Avise o time.' });
    }

    // Marca docs_recebidos_em nos registros do candidato (busca por email/whatsapp)
    const whatsClean = String(whatsapp).replace(/\D/g, '').replace(/^55/, '');
    const updateBody = JSON.stringify({ docs_recebidos_em: new Date().toISOString() });
    const updateHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };

    // Tenta atualizar nas duas tabelas (ignora erros silenciosamente)
    Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/candidaturas?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH', headers: updateHeaders, body: updateBody
      }).catch(() => {}),
      fetch(`${SUPABASE_URL}/rest/v1/cadastros_completos?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH', headers: updateHeaders, body: updateBody
      }).catch(() => {})
    ]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}
