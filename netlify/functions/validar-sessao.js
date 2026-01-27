const SENHA_UNICA = 'Danielmigueldanielmiguelfeioscriptlixococo103643cod8gomorseu10';

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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo nao permitido' }) };
    }

    try {
        const { codigo } = JSON.parse(event.body || '{}');

        if (!codigo) {
            return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
        }

        if (codigo === SENHA_UNICA) {
            return { statusCode: 200, headers, body: JSON.stringify({ valid: true, user: 'Usuario Autorizado' }) };
        }

        return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ valid: false }) };
    }
};
