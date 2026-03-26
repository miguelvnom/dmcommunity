const clientPromise = require('./lib/mongodb');

const BLOCKED_UA = [
    'curl', 'wget', 'python-requests', 'scrapy',
    'httpx', 'go-http-client', 'libwww', 'httpie',
    'insomnia', 'postman', 'okhttp'
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Metodo nao permitido' });
    }

    // Bloqueia curl/scrapers
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    if (BLOCKED_UA.some(blocked => ua.includes(blocked))) {
        return res.status(403).json({ success: false, message: 'NAO AUTORIZADO' });
    }

    try {
        const { id, codigo } = req.body;

        if (!codigo) {
            return res.json({ success: false, message: 'NAO AUTORIZADO TENTE DESOFUSCAR OUTRO SCRIPT' });
        }

        const client = await clientPromise;
        const db = client.db('dmcommunity');

        // Verifica se o codigo e valido E se ja foi ativado pelo usuario
        const codes = db.collection('codes');
        const codeData = await codes.findOne({
            code: codigo.toUpperCase(),
            usado: true  // So aceita codigos que foram ativados
        });

        if (!codeData) {
            return res.json({ success: false, message: 'NAO AUTORIZADO - Codigo invalido ou nao ativado' });
        }

        // Busca o script
        const scripts = db.collection('scripts');
        const script = await scripts.findOne({ id: parseInt(id) });

        if (!script) {
            return res.json({ success: false, message: 'Script nao encontrado' });
        }

        return res.json({ success: true, script: script.script });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
};
