const clientPromise = require('./lib/mongodb');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo nao permitido' });
    }

    try {
        const { codigo } = req.body;

        if (!codigo) {
            return res.json({ valid: false });
        }

        const client = await clientPromise;
        const db = client.db('dmcommunity');
        const codes = db.collection('codes');

        const codeData = await codes.findOne({ code: codigo.toUpperCase() });

        if (codeData) {
            return res.json({ valid: true, user: codeData.discordTag });
        }

        return res.json({ valid: false });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ valid: false });
    }
};
