require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

// Armazena os codigos validos (compartilhado com o server via arquivo)
const fs = require('fs');
const CODES_FILE = './codes.json';

// Carrega codigos existentes ou cria arquivo vazio
function loadCodes() {
    try {
        if (fs.existsSync(CODES_FILE)) {
            return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        }
    } catch (e) {
        console.log('Criando novo arquivo de codigos...');
    }
    return {};
}

function saveCodes(codes) {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
}

// Gera codigo aleatorio
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Verifica se usuario tem cargo permitido
function hasAllowedRole(member) {
    return member.roles.cache.some(role => config.ALLOWED_ROLES.includes(role.id));
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Bot online como ${client.user.tag}`);
    console.log(`Servidor: ${config.GUILD_ID}`);
    console.log(`Cargos permitidos: ${config.ALLOWED_ROLES.length}`);
});

client.on('messageCreate', async (message) => {
    // Ignora bots
    if (message.author.bot) return;

    // Verifica se e o comando !verificar
    if (message.content.toLowerCase() === '!verificar') {
        // Verifica se esta no servidor correto
        if (message.guild?.id !== config.GUILD_ID) {
            return message.reply('Este comando so funciona no servidor autorizado.');
        }

        // Verifica se tem cargo permitido
        if (!hasAllowedRole(message.member)) {
            return message.reply('Voce nao tem permissao para usar este comando.');
        }

        // Gera codigo unico
        const code = generateCode();
        const codes = loadCodes();

        // Salva codigo com info do usuario
        codes[code] = {
            odiscer: message.author.id,
            odiscerTag: message.author.tag,
            criadoEm: new Date().toISOString(),
            usado: false
        };

        saveCodes(codes);

        // Envia codigo por DM
        try {
            await message.author.send({
                embeds: [{
                    title: 'Codigo de Verificacao',
                    description: `Seu codigo de acesso:\n\n\`\`\`${code}\`\`\``,
                    color: 0x00ff00,
                    footer: { text: 'Use este codigo no site para acessar.' },
                    timestamp: new Date().toISOString()
                }]
            });
            await message.reply('Enviei seu codigo de verificacao por DM!');
        } catch (error) {
            // Se nao conseguir enviar DM, envia no canal (cuidado com seguranca)
            await message.reply(`Nao consegui enviar DM. Seu codigo: ||\`${code}\`|| (clique para revelar)`);
        }
    }
});

client.login(config.BOT_TOKEN);
