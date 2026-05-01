// API que busca endereço pelo CEP (usa ViaCEP, gratuito, sem chave)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cep = (req.query.cep || '').toString().replace(/\D/g, '');

  if (!cep || cep.length !== 8) {
    return res.status(400).json({ error: 'CEP inválido (precisa ter 8 dígitos)' });
  }

  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) {
      return res.status(502).json({ error: 'Erro ao consultar CEP' });
    }
    const data = await r.json();
    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado' });
    }
    return res.status(200).json({
      cep: data.cep,
      rua: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || ''
    });
  } catch (error) {
    console.error('Erro CEP:', error);
    return res.status(500).json({ error: 'Erro ao consultar CEP' });
  }
}
