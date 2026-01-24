require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { MongoClient } = require('mongodb');
const config = require('./config');

// Conexao MongoDB
let db;
let mongoClient;

async function connectDB(retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            mongoClient = new MongoClient(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            });
            await mongoClient.connect();
            db = mongoClient.db('dmcommunity');
            console.log('Conectado ao MongoDB!');
            return;
        } catch (error) {
            console.error(`Tentativa ${i + 1}/${retries} falhou:`, error.message);
            if (i < retries - 1) {
                console.log('Tentando novamente em 5 segundos...');
                await new Promise(r => setTimeout(r, 5000));
            } else {
                console.error('Falha ao conectar ao MongoDB apos todas as tentativas.');
                process.exit(1);
            }
        }
    }
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

client.once('ready', async () => {
    console.log(`Bot online como ${client.user.tag}`);
    console.log(`Servidor: ${config.GUILD_ID}`);
    console.log(`Cargos permitidos: ${config.ALLOWED_ROLES.length}`);

    // Conecta ao MongoDB
    await connectDB();
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

        // Salva codigo no MongoDB
        try {
            await db.collection('codes').insertOne({
                code: code,
                discordId: message.author.id,
                discordTag: message.author.tag,
                criadoEm: new Date().toISOString(),
                usado: false
            });

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
                // Se nao conseguir enviar DM, envia no canal
                await message.reply(`Nao consegui enviar DM. Seu codigo: ||\`${code}\`|| (clique para revelar)`);
            }
        } catch (error) {
            console.error('Erro ao salvar codigo:', error);
            await message.reply('Erro ao gerar codigo. Tente novamente.');
        }
    }
});

client.login(config.BOT_TOKEN);
