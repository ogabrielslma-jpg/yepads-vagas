// API que busca o cadastro de um candidato pelo CPF.
// Usado no /onboarding pra pré-preencher os dados sem pedir tudo de novo.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cpf } = req.body || {};

  if (!cpf) {
    return res.status(400).json({ error: 'CPF é obrigatório' });
  }

  const cpfLimpo = String(cpf).replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Servidor não configurado' });
  }

  try {
    // Busca tanto pelo CPF formatado quanto sem formatação
    const cpfFormatado = formatarCpf(cpfLimpo);
    const cpfsParaBuscar = [cpfLimpo, cpfFormatado];
    const orFilter = cpfsParaBuscar
      .map(c => `cpf.eq.${encodeURIComponent(c)}`)
      .join(',');

    const url = `${SUPABASE_URL}/rest/v1/cadastros_completos?or=(${orFilter})&select=*&order=created_at.desc&limit=1`;

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Supabase:', errText);
      return res.status(500).json({ error: 'Erro ao buscar cadastro' });
    }

    const dados = await response.json();

    if (!dados || dados.length === 0) {
      return res.status(404).json({ error: 'CPF não encontrado' });
    }

    const c = dados[0];
    return res.status(200).json({
      ok: true,
      cadastro: {
        nome_completo: c.nome_completo || c.nome || '',
        email: c.email || '',
        whatsapp: c.whatsapp || c.whats || '',
        cpf: c.cpf || cpfFormatado,
        data_nascimento: c.data_nascimento || '',
        cidade: c.cidade || '',
        estado: c.estado || '',
        vaga: c.vaga || ''
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}

function formatarCpf(cpf) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
