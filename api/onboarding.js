// API do onboarding: recebe dados pessoais + KYC + dados bancários
// Salva uploads no Supabase Storage e cria registro em onboardings

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    // Step 1
    nome_completo, email, whatsapp, cpf, data_nascimento,
    cep, rua, numero, complemento, bairro, cidade, estado,
    // Step 2 (KYC)
    rg_base64, rg_filename,
    comprovante_residencia_base64, comprovante_residencia_filename,
    dados_verdadeiros, autorizacao_consulta,
    // Step 3 (bancário)
    tem_conta_internacional, banco,
    comprovante_conta_base64, comprovante_conta_filename,
    observacoes
  } = req.body || {};

  // Validações básicas
  if (!nome_completo || !email || !whatsapp) {
    return res.status(400).json({ error: 'Nome, email e WhatsApp são obrigatórios' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!rg_base64 || !comprovante_residencia_base64) {
    return res.status(400).json({ error: 'Documentos obrigatórios faltando (RG/CNH e comprovante)' });
  }
  if (!dados_verdadeiros || !autorizacao_consulta) {
    return res.status(400).json({ error: 'Você precisa confirmar as duas autorizações' });
  }
  if (tem_conta_internacional === undefined || tem_conta_internacional === null) {
    return res.status(400).json({ error: 'Informe se tem conta internacional' });
  }
  if (tem_conta_internacional && !comprovante_conta_base64) {
    return res.status(400).json({ error: 'Anexe o comprovante da sua conta para recebimento' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    const slug = (email || whatsapp).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
    const timestamp = Date.now();
    const folder = `onboarding-${slug}-${timestamp}`;

    async function uploadFile(base64Data, fileLabel) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const mimeMatch = base64Data.match(/^data:([^;]+);base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      let ext = '.jpg';
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('pdf')) ext = '.pdf';
      const safeFilename = `${fileLabel}${ext}`;
      const path = `${folder}/${safeFilename}`;

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
      return path;
    }

    // Uploads em paralelo
    const uploadsPromises = [
      uploadFile(rg_base64, 'rg'),
      uploadFile(comprovante_residencia_base64, 'comprovante-residencia')
    ];
    if (comprovante_conta_base64) {
      uploadsPromises.push(uploadFile(comprovante_conta_base64, 'comprovante-conta'));
    }
    const uploads = await Promise.all(uploadsPromises);
    const [rgPath, comprovanteResidPath, comprovanteContaPath] = uploads;

    // Salva no banco
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/onboardings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        nome_completo, email, whatsapp, cpf: cpf || null,
        data_nascimento: data_nascimento || null,
        cep: cep || null, rua: rua || null, numero: numero || null,
        complemento: complemento || null, bairro: bairro || null,
        cidade: cidade || null, estado: estado || null,
        rg_url: rgPath,
        comprovante_residencia_url: comprovanteResidPath,
        dados_verdadeiros: !!dados_verdadeiros,
        autorizacao_consulta: !!autorizacao_consulta,
        tem_conta_internacional: !!tem_conta_internacional,
        banco: banco || null,
        comprovante_conta_url: comprovanteContaPath || null,
        observacoes: observacoes || '',
        status: 'em_analise',
        step_concluido: 3
      })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('Erro insert onboarding:', errText);
      return res.status(500).json({ error: 'Erro ao salvar onboarding. Avise o time.' });
    }

    // Marca onboarding_em nas tabelas de candidaturas (busca por email)
    const updateBody = JSON.stringify({ onboarding_em: new Date().toISOString() });
    const updateHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
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
