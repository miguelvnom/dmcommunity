const SENHA_UNICA = 'Danielmigueldanielmiguelfeioscriptlixococo103643cod8gomorseu10';

exports.handler = async (event, context) => {
    // CORS headers
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
            return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Senha nao fornecida' }) };
        }

        if (codigo !== SENHA_UNICA) {
            return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Senha incorreta' }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Senha correta! Bem-vindo!',
                user: 'Usuario Autorizado'
            })
        };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro no servidor' }) };
    }
};
