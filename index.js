import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import WebSocket from 'ws';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// خزن القناة التي يريد المستخدم أن تُرسل فيها الرسائل
let stockChannelId = null;

// أمر سلاش لتحديد القناة
const commands = [
    new SlashCommandBuilder()
        .setName('setstockchannel')
        .setDescription('حدد القناة التي سيتم إرسال ستوك البوت فيها')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(true))
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// تسجيل أمر السلاش عالميًا
(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ تم تسجيل أوامر السلاش');
    } catch (err) {
        console.error(err);
    }
})();

client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'setstockchannel') {
        const channel = interaction.options.getChannel('channel');
        stockChannelId = channel.id;
        await interaction.reply({ content: `تم تحديد القناة: ${channel}`, ephemeral: true });
    }
});

// الاتصال بالـ GAG Stock WebSocket
const ws = new WebSocket('wss://gagstock.gleeze.com');

ws.on('open', () => {
    console.log('🔗 متصل بـ GAG Stock WebSocket');
});

ws.on('message', async data => {
    if (!stockChannelId) return;

    const msgData = JSON.parse(data);
    if (msgData.type === 'grow-a-garden') {
        const stock = msgData.data;

        let stockMessage = '📦 **الستوك الحالي:**\n';

        for (const category of ['egg','gear','seed','honey','cosmetics','travelingmerchant']) {
            if (stock[category] && stock[category].items) {
                stockMessage += `\n**${category.toUpperCase()}:**\n`;
                stock[category].items.forEach(item => {
                    stockMessage += `${item.emoji || ''} ${item.name} × ${item.quantity}\n`;
                });
            }
        }

        const channel = await client.channels.fetch(stockChannelId);
        channel.send(stockMessage);
    }
});

client.login(process.env.TOKEN);
