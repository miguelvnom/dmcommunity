const clientPromise = require('./lib/mongodb');

module.exports = async (req, res) => {
    try {
        const { id } = req.query;

        const client = await clientPromise;
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');

        const script = await scripts.findOne({ id: parseInt(id) });

        if (!script) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(404).send('Script nao encontrado');
        }

        res.setHeader('Content-Type', 'text/plain');
        return res.send(script.script);
    } catch (error) {
        console.error(error);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(500).send('Erro no servidor');
    }
};
