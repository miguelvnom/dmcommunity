const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectDB() {
    if (cachedClient) return cachedClient;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

exports.handler = async (event, context) => {
    try {
        const params = event.queryStringParameters || {};
        let id = params.id;

        // Pega o User-Agent
        const userAgent = (event.headers['user-agent'] || event.headers['User-Agent'] || '').toLowerCase();

        // Só permite se for executor Roblox (contém "roblox") ou User-Agent vazio/curto
        const isRobloxExecutor = userAgent.includes('roblox') ||
                                  userAgent.includes('synapse') ||
                                  userAgent.includes('krnl') ||
                                  userAgent.includes('fluxus') ||
                                  userAgent.includes('delta') ||
                                  userAgent.includes('script-ware') ||
                                  userAgent.includes('electron') ||
                                  userAgent === '' ||
                                  userAgent.length < 20;

        // Bloqueia tudo que não for executor
        if (!isRobloxExecutor) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'text/html' },
                body: `<!DOCTYPE html>
<html>
<head>
    <title>NAO AUTORIZADO</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        .emoji {
            width: 250px;
            height: auto;
            margin-bottom: 30px;
            animation: shake 0.5s infinite;
        }
        h1 {
            font-size: 4rem;
            color: #ff4757;
            text-shadow: 0 0 20px rgba(255, 71, 87, 0.5);
            margin-bottom: 20px;
            animation: pulse 1.5s infinite;
        }
        p {
            font-size: 1.5rem;
            color: #ff6b81;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes shake {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://media.discordapp.net/attachments/1460865475427962921/1465551386207850638/depositphotos_139840912-stock-illustration-laughing-with-tears-and-pointing.png?ex=69798497&is=69783317&hm=8a930e13a1f6c2817753214210683fe33a0f71964e8868683494b0d04d767889&=&format=webp&quality=lossless&width=660&height=433" alt="Emoji rindo" class="emoji">
        <h1>NAO AUTORIZADO</h1>
        <p>TENTE DESOBFUSCAR OUTRO SCRIPT!!!!!</p>
    </div>
</body>
</html>`
            };
        }

        // Se não veio ID por query, tenta pegar do path
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

        // Fallback: tenta do rawQuery
        if (!id && event.rawQuery) {
            const queryMatch = event.rawQuery.match(/id=(\d+)/);
            if (queryMatch) {
                id = queryMatch[1];
            }
        }

        // Valida se o ID existe e é um número
        if (!id || isNaN(parseInt(id))) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'text/plain' },
                body: 'ID invalido'
            };
        }

        const client = await connectDB();
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');

        const idNum = parseInt(id);
        const script = await scripts.findOne({
            $or: [{ id: idNum }, { id: id.toString() }]
        });

        if (!script) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Script nao encontrado'
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
            body: 'Erro no servidor'
        };
    }
};
