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
                headers: { 'Content-Type': 'text/plain' },
                body: 'NAO AUTORIZADO'
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
