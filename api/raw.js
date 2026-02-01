const clientPromise = require('./lib/mongodb');

// Pagina HTML de nao autorizado
const UNAUTHORIZED_HTML = `<!DOCTYPE html>
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
</html>`;

// Detecta se e browser (NAO executor Roblox)
// Apenas bloqueia se tiver headers que SO navegadores enviam
function isBrowserOrTool(req) {
    const headers = req.headers || {};

    // Headers que SO navegadores enviam (executores Roblox nunca enviam esses)
    if (headers['sec-fetch-site']) return true;
    if (headers['sec-fetch-mode']) return true;
    if (headers['sec-fetch-dest']) return true;
    if (headers['sec-ch-ua']) return true;

    // Accept com text/html = browser pedindo pagina web
    const accept = headers['accept'] || '';
    if (accept.includes('text/html')) return true;

    // Se nao tem nenhum header de browser, permite (executor Roblox)
    return false;
}

// Resposta de nao autorizado
function unauthorized(req, res) {
    const accept = req.headers['accept'] || '';

    if (accept.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(403).send(UNAUTHORIZED_HTML);
    } else {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(403).send('-- NAO AUTORIZADO\n-- Acesso bloqueado');
    }
}

module.exports = async (req, res) => {
    try {
        let { id, code } = req.query;

        // Tenta pegar ID do path (/raw/123)
        if (!id) {
            const match = req.url.match(/\/raw\/(\d+)/);
            if (match) id = match[1];
        }

        if (!id || isNaN(parseInt(id))) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(400).send('-- ID invalido');
        }

        const client = await clientPromise;
        const db = client.db('dmcommunity');

        // Se tem codigo, valida ele
        if (code) {
            const codes = db.collection('codes');
            const codeData = await codes.findOne({
                code: code.toUpperCase(),
                usado: true
            });

            if (!codeData) {
                return unauthorized(req, res);
            }
        } else {
            // Sem codigo - so permite se for executor Roblox
            if (isBrowserOrTool(req)) {
                return unauthorized(req, res);
            }
        }

        // Busca o script
        const scripts = db.collection('scripts');
        const script = await scripts.findOne({ id: parseInt(id) });

        if (!script) {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(404).send('-- Script nao encontrado');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(script.script);
    } catch (error) {
        console.error(error);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(500).send('-- Erro no servidor');
    }
};
