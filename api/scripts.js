const clientPromise = require('./lib/mongodb');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const client = await clientPromise;
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');
        const codes = db.collection('codes');

        // GET - Listar scripts
        if (req.method === 'GET') {
            const allScripts = await scripts.find({}).sort({ criadoEm: -1 }).toArray();
            return res.json(allScripts);
        }

        // POST - Adicionar script
        if (req.method === 'POST') {
            const { nome, codigo, script, usuario } = req.body;

            if (!nome || !script || !usuario) {
                return res.json({ success: false, message: 'Dados incompletos' });
            }

            // Verifica se o codigo de acesso e valido
            const codeData = await codes.findOne({ code: codigo?.toUpperCase() });

            if (!codeData) {
                return res.json({ success: false, message: 'Codigo de acesso invalido' });
            }

            const novoScript = {
                id: Date.now(),
                nome: nome,
                script: script,
                autor: usuario,
                criadoEm: new Date().toISOString()
            };

            await scripts.insertOne(novoScript);

            return res.json({ success: true, message: 'Script salvo com sucesso!' });
        }

        // DELETE - Deletar script
        if (req.method === 'DELETE') {
            const { id } = req.query;
            const { codigo } = req.body;

            const codeData = await codes.findOne({ code: codigo?.toUpperCase() });

            if (!codeData) {
                return res.json({ success: false, message: 'Codigo de acesso invalido' });
            }

            const script = await scripts.findOne({ id: parseInt(id) });

            if (!script) {
                return res.json({ success: false, message: 'Script nao encontrado' });
            }

            if (script.autor !== codeData.discordTag) {
                return res.json({ success: false, message: 'Voce so pode deletar seus proprios scripts' });
            }

            await scripts.deleteOne({ id: parseInt(id) });

            return res.json({ success: true, message: 'Script deletado!' });
        }

        return res.status(405).json({ error: 'Metodo nao permitido' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
};
