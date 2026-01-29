const clientPromise = require('./lib/mongodb');

module.exports = async (req, res) => {
    try {
        const { id } = req.query;
        const userAgent = req.headers['user-agent'] || '';
        const accept = req.headers['accept'] || '';

        // Detecta se e navegador (aceita HTML)
        const isBrowser = accept.includes('text/html') && !userAgent.includes('Roblox');

        if (isBrowser) {
            // Retorna pagina de nao autorizado
            res.setHeader('Content-Type', 'text/html');
            return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAO AUTORIZADO</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Consolas', monospace;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            text-align: center;
        }
        h1 { color: #ff4757; font-size: 3em; margin-bottom: 20px; }
        p { color: #ff6b6b; font-size: 1.2em; }
        img { margin-bottom: 20px; }
    </style>
</head>
<body>
    <img src="https://i.imgur.com/JvPrBbS.png" alt="emoji rindo" width="100">
    <h1>NAO AUTORIZADO</h1>
    <p>TENTE DESOBFUSCAR OUTRO SCRIPT!!!!!</p>
</body>
</html>`);
        }

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
