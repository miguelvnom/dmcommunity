const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectDB() {
    if (cachedClient) return cachedClient;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

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

// Resposta de nao autorizado (detecta se e browser ou executor)
function getUnauthorizedResponse(event) {
    const accept = event.headers['accept'] || event.headers['Accept'] || '';
    const isBrowser = accept.includes('text/html');

    if (isBrowser) {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'text/html' },
            body: UNAUTHORIZED_HTML
        };
    } else {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'text/plain' },
            body: '-- NAO AUTORIZADO\n-- Codigo de acesso invalido ou ausente\n-- Acesse o site para obter seu codigo'
        };
    }
}

exports.handler = async (event, context) => {
    try {
        const params = event.queryStringParameters || {};
        let id = params.id;
        let code = params.code;

        // SEMPRE exige codigo - nao importa se e browser ou executor
        if (!code) {
            return getUnauthorizedResponse(event);
        }

        // Se nao veio ID por query, tenta pegar do path
        if (!id) {
            const urlToParse = event.rawUrl || event.path || '';
            let match = urlToParse.match(/\/raw\/(\d+)/);
            if (match) {
                id = match[1];
            }
            if (!id) {
                match = urlToParse.match(/\/(\d+)$/);
                if (match) {
                    id = match[1];
                }
            }
        }

        // Valida se o ID existe e e um numero
        if (!id || isNaN(parseInt(id))) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'text/plain' },
                body: '-- ID invalido'
            };
        }

        const client = await connectDB();
        const db = client.db('dmcommunity');

        // Valida o codigo no banco de dados - so aceita codigos ativados
        const codes = db.collection('codes');
        const codeData = await codes.findOne({
            code: code.toUpperCase(),
            usado: true  // So aceita codigos que foram ativados pelo usuario
        });

        if (!codeData) {
            return getUnauthorizedResponse(event);
        }

        // Codigo valido - busca o script
        const scripts = db.collection('scripts');
        const idNum = parseInt(id);
        const script = await scripts.findOne({
            $or: [{ id: idNum }, { id: id.toString() }]
        });

        if (!script) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                body: '-- Script nao encontrado'
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: script.script
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: '-- Erro no servidor'
        };
    }
};
