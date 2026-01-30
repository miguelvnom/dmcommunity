const clientPromise = require('./lib/mongodb');

// Pagina HTML de nao autorizado (igual tcscripts)
const UNAUTHORIZED_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nao autorizado</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap');
        body {
            margin: 0; padding: 0;
            height: 100vh;
            font-family: 'Poppins', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #0a0a0a;
        }
        .container {
            background: #fff;
            border: 4px solid #e63946;
            border-radius: 20px;
            padding: 50px 70px;
            text-align: center;
            box-shadow: 0 0 15px #e63946aa, 0 0 40px #e6394644, 0 0 70px #e6394622;
            max-width: 420px;
            user-select: none;
        }
        .emoji {
            font-size: 6.5rem;
            color: #e63946;
            animation: pulse 2s ease-in-out infinite alternate;
            margin-bottom: 15px;
            filter: drop-shadow(0 0 20px #e63946aa);
        }
        h1 {
            font-size: 2.8rem;
            margin: 0 0 15px;
            color: #1d1d1d;
            text-shadow: 0 0 5px #e63946aa;
        }
        p {
            font-size: 1.2rem;
            color: #555;
            margin: 0;
            font-weight: 600;
        }
        @keyframes pulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 10px #e63946aa); }
            100% { transform: scale(1.12); filter: drop-shadow(0 0 30px #e63946cc); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">&#10060;</div>
        <h1>Nao autorizado</h1>
        <p>Voce nao tem permissao para acessar esta pagina.</p>
    </div>
</body>
</html>`;

// Detecta se e navegador (NAO executor Roblox)
function isBrowser(req) {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const accept = req.headers['accept'] || '';
    const acceptLang = req.headers['accept-language'] || '';
    const secFetchSite = req.headers['sec-fetch-site'] || '';
    const secFetchMode = req.headers['sec-fetch-mode'] || '';

    // Headers que SO navegadores enviam
    if (secFetchSite || secFetchMode) return true;
    if (accept.includes('text/html')) return true;
    if (acceptLang) return true;

    // User-Agents de navegadores/ferramentas
    const browserAgents = [
        'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera',
        'postman', 'insomnia', 'curl', 'wget', 'python', 'node',
        'axios', 'got', 'java', 'okhttp', 'apache', 'go-http',
        'ruby', 'perl', 'php', 'httpie', 'fiddler', 'charles'
    ];

    for (const agent of browserAgents) {
        if (userAgent.includes(agent)) return true;
    }

    return false;
}

module.exports = async (req, res) => {
    // Se for navegador, mostra pagina de nao autorizado
    if (isBrowser(req)) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(403).send(UNAUTHORIZED_HTML);
    }

    // E executor Roblox - retorna o codigo
    try {
        let { id } = req.query;

        // Tenta pegar ID do path (/raw/123)
        if (!id) {
            const match = req.url.match(/\/raw\/(\d+)/);
            if (match) id = match[1];
        }

        if (!id) {
            return res.status(404).send('-- ID nao fornecido');
        }

        const client = await clientPromise;
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');

        const script = await scripts.findOne({ id: parseInt(id) });

        if (!script) {
            return res.status(404).send('-- Script nao encontrado');
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(script.script);
    } catch (error) {
        console.error(error);
        return res.status(500).send('-- Erro no servidor');
    }
};
