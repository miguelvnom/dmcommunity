const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
const CODES_FILE = './codes.json';
const SCRIPTS_FILE = './scripts.json';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Carrega codigos
function loadCodes() {
    try {
        if (fs.existsSync(CODES_FILE)) {
            return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        }
    } catch (e) {
        console.log('Arquivo de codigos nao encontrado');
    }
    return {};
}

function saveCodes(codes) {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
}

// Carrega scripts obfuscados
function loadScripts() {
    try {
        if (fs.existsSync(SCRIPTS_FILE)) {
            return JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf8'));
        }
    } catch (e) {
        console.log('Arquivo de scripts nao encontrado');
    }
    return [];
}

function saveScripts(scripts) {
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2));
}

// Rota para verificar codigo
app.post('/api/verificar', (req, res) => {
    const { codigo } = req.body;

    if (!codigo) {
        return res.json({ success: false, message: 'Codigo nao fornecido' });
    }

    const codes = loadCodes();
    const codeData = codes[codigo.toUpperCase()];

    if (!codeData) {
        return res.json({ success: false, message: 'Codigo invalido' });
    }

    // Marca codigo como usado
    codes[codigo.toUpperCase()].usado = true;
    codes[codigo.toUpperCase()].usadoEm = new Date().toISOString();
    saveCodes(codes);

    return res.json({
        success: true,
        message: 'Codigo valido! Bem-vindo!',
        user: codeData.odiscerTag
    });
});

// Rota para validar sessao (verifica se codigo ja foi validado)
app.post('/api/validar-sessao', (req, res) => {
    const { codigo } = req.body;

    if (!codigo) {
        return res.json({ valid: false });
    }

    const codes = loadCodes();
    const codeData = codes[codigo.toUpperCase()];

    if (codeData) {
        return res.json({ valid: true, user: codeData.odiscerTag });
    }

    return res.json({ valid: false });
});

// Rota para adicionar script obfuscado
app.post('/api/scripts', (req, res) => {
    const { nome, codigo, script, usuario } = req.body;

    if (!nome || !script || !usuario) {
        return res.json({ success: false, message: 'Dados incompletos' });
    }

    // Verifica se o codigo de acesso e valido
    const codes = loadCodes();
    const codeData = codes[codigo?.toUpperCase()];

    if (!codeData) {
        return res.json({ success: false, message: 'Codigo de acesso invalido' });
    }

    const scripts = loadScripts();

    const novoScript = {
        id: Date.now(),
        nome: nome,
        script: script,
        autor: usuario,
        criadoEm: new Date().toISOString()
    };

    scripts.unshift(novoScript);
    saveScripts(scripts);

    return res.json({ success: true, message: 'Script salvo com sucesso!' });
});

// Rota para listar scripts
app.get('/api/scripts', (req, res) => {
    const scripts = loadScripts();
    return res.json(scripts);
});

// Rota para deletar script
app.delete('/api/scripts/:id', (req, res) => {
    const { id } = req.params;
    const { codigo } = req.body;

    // Verifica se o codigo de acesso e valido
    const codes = loadCodes();
    const codeData = codes[codigo?.toUpperCase()];

    if (!codeData) {
        return res.json({ success: false, message: 'Codigo de acesso invalido' });
    }

    let scripts = loadScripts();
    const scriptIndex = scripts.findIndex(s => s.id === parseInt(id));

    if (scriptIndex === -1) {
        return res.json({ success: false, message: 'Script nao encontrado' });
    }

    // Verifica se e o autor
    if (scripts[scriptIndex].autor !== codeData.odiscerTag) {
        return res.json({ success: false, message: 'Voce so pode deletar seus proprios scripts' });
    }

    scripts.splice(scriptIndex, 1);
    saveScripts(scripts);

    return res.json({ success: true, message: 'Script deletado!' });
});

// Rota RAW - mostra o script em texto puro
app.get('/raw/:id', (req, res) => {
    const { id } = req.params;
    const scripts = loadScripts();
    const script = scripts.find(s => s.id === parseInt(id));

    if (!script) {
        res.type('text/plain');
        return res.status(404).send('Script nao encontrado');
    }

    res.type('text/plain');
    res.send(script.script);
});

// Pagina principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.PORT, () => {
    console.log(`Servidor rodando em http://localhost:${config.PORT}`);
});
