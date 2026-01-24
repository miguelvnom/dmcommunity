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

        // Detecta se é navegador pelo User-Agent
        const userAgent = (event.headers['user-agent'] || event.headers['User-Agent'] || '').toLowerCase();
        const isBrowser = userAgent.includes('mozilla') ||
                          userAgent.includes('chrome') ||
                          userAgent.includes('safari') ||
                          userAgent.includes('firefox') ||
                          userAgent.includes('edge') ||
                          userAgent.includes('opera');

        // Se for navegador acessando /raw/ direto, bloqueia
        if (isBrowser) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Acesso negado. Use o site para visualizar scripts.'
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
