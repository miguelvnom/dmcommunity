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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Metodo nao permitido' }) };
    }

    try {
        const { id, codigo } = JSON.parse(event.body || '{}');

        // Verifica se o codigo foi fornecido
        if (!codigo) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, message: 'Codigo de acesso necessario' })
            };
        }

        // Verifica se o ID foi fornecido
        if (!id) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, message: 'ID do script necessario' })
            };
        }

        const client = await connectDB();
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');
        const codes = db.collection('codes');

        // Valida o codigo de acesso - so aceita codigos ativados
        const codeData = await codes.findOne({
            code: codigo.toUpperCase(),
            usado: true  // So aceita codigos que foram ativados pelo usuario
        });
        if (!codeData) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, message: 'NAO AUTORIZADO - Codigo invalido ou nao ativado' })
            };
        }

        // Busca o script
        const idNum = parseInt(id);
        const script = await scripts.findOne({
            $or: [{ id: idNum }, { id: id.toString() }]
        });

        if (!script) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: false, message: 'Script nao encontrado' })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, script: script.script })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro no servidor' })
        };
    }
};
