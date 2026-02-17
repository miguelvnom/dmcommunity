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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const client = await connectDB();
        const db = client.db('dmcommunity');
        const scripts = db.collection('scripts');
        const codes = db.collection('codes');

        // GET - Listar scripts
        if (event.httpMethod === 'GET') {
            const allScripts = await scripts.find({}).sort({ criadoEm: -1 }).toArray();
            return { statusCode: 200, headers, body: JSON.stringify(allScripts) };
        }

        // POST - Adicionar script
        if (event.httpMethod === 'POST') {
            const { nome, codigo, script, usuario } = JSON.parse(event.body || '{}');

            if (!nome || !script || !usuario) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Dados incompletos' }) };
            }

            const codeData = await codes.findOne({ code: codigo?.toUpperCase() });

            if (!codeData) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Codigo de acesso invalido' }) };
            }

            const novoScript = {
                id: Date.now(),
                nome: nome,
                script: script,
                autor: usuario,
                criadoEm: new Date().toISOString()
            };

            await scripts.insertOne(novoScript);

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Script salvo com sucesso!' }) };
        }

        // PUT - Editar script
        if (event.httpMethod === 'PUT') {
            const params = event.queryStringParameters || {};
            const { codigo, script: novoScript } = JSON.parse(event.body || '{}');
            const id = params.id;

            const codeData = await codes.findOne({ code: codigo?.toUpperCase() });

            if (!codeData) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Codigo de acesso invalido' }) };
            }

            const scriptExistente = await scripts.findOne({ id: parseInt(id) });

            if (!scriptExistente) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Script nao encontrado' }) };
            }

            if (scriptExistente.autor !== codeData.discordTag) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Voce so pode editar seus proprios scripts' }) };
            }

            await scripts.updateOne({ id: parseInt(id) }, { $set: { script: novoScript } });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Script atualizado!' }) };
        }

        // DELETE - Deletar script
        if (event.httpMethod === 'DELETE') {
            const params = event.queryStringParameters || {};
            const { codigo } = JSON.parse(event.body || '{}');
            const id = params.id;

            const codeData = await codes.findOne({ code: codigo?.toUpperCase() });

            if (!codeData) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Codigo de acesso invalido' }) };
            }

            const script = await scripts.findOne({ id: parseInt(id) });

            if (!script) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Script nao encontrado' }) };
            }

            if (script.autor !== codeData.discordTag) {
                return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Voce so pode deletar seus proprios scripts' }) };
            }

            await scripts.deleteOne({ id: parseInt(id) });

            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Script deletado!' }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo nao permitido' }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro no servidor' }) };
    }
};
