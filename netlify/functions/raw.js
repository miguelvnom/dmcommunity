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
        // Pega o ID e codigo do query parameter
        const params = event.queryStringParameters || {};
        let id = params.id;
        let codigo = params.codigo;

        // Fallback: tenta pegar codigo da rawQuery
        if (!codigo && event.rawQuery) {
            const codigoMatch = event.rawQuery.match(/codigo=([^&]+)/);
            if (codigoMatch) {
                codigo = decodeURIComponent(codigoMatch[1]);
            }
        }

        // Verifica se o codigo de acesso foi fornecido
        if (!codigo) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Acesso negado. Faca login primeiro.'
            };
        }

        // Se não veio por query, tenta pegar do path
        if (!id) {
            const urlToParse = event.rawUrl || event.path || '';

            // Tenta /raw/123 primeiro
            let match = urlToParse.match(/\/raw\/(\d+)/);
            if (match) {
                id = match[1];
            }

            // Tenta /.netlify/functions/raw/123
            if (!id) {
                match = urlToParse.match(/\/raw\/(\d+)/i) || urlToParse.match(/\/(\d+)$/);
                if (match) {
                    id = match[1];
                }
            }
        }

        // Fallback: tenta do rawQuery ou path parameter
        if (!id && event.rawQuery) {
            const queryMatch = event.rawQuery.match(/id=(\d+)/);
            if (queryMatch) {
                id = queryMatch[1];
            }
        }

        // Último fallback: path params do Netlify
        if (!id && event.path) {
            const pathParts = event.path.split('/').filter(p => p);
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && /^\d+$/.test(lastPart)) {
                id = lastPart;
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
        const codes = db.collection('codes');

        // Valida o codigo de acesso
        const codeData = await codes.findOne({ code: codigo.toUpperCase() });
        if (!codeData) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Codigo de acesso invalido'
            };
        }

        // Tenta buscar como número ou como string
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
