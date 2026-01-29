const clientPromise = require('./lib/mongodb');

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

    try {
        const { id, codigo } = req.body;

        if (!codigo) {
            return res.json({ success: false, message: 'NAO AUTORIZADO TENTE DESOFUSCAR OUTRO SCRIPT' });
        }

        const client = await clientPromise;
        const db = client.db('dmcommunity');

        // Verifica se o codigo e valido
        const codes = db.collection('codes');
        const codeData = await codes.findOne({ code: codigo.toUpperCase() });

        if (!codeData) {
            return res.json({ success: false, message: 'NAO AUTORIZADO TENTE DESOFUSCAR OUTRO SCRIPT' });
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
