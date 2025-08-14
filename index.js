// index.js
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } from 'discord.js';
import WebSocket from 'ws';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const TOKEN = process.env.DISCORD_TOKEN;

let targetChannelId = null;

// تسجيل أمر السلاش عند تشغيل البوت
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('setstockchannel')
            .setDescription('حدد القناة التي يرسل فيها البوت الستوك')
            .addChannelOption(option =>
                option.setName('channel')
                      .setDescription('اختر القناة')
                      .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ أمر السلاش جاهز للاستخدام.');
});

// تنفيذ أمر السلاش لتحديد القناة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setstockchannel') {
        const channel = interaction.options.getChannel('channel');
        targetChannelId = channel.id;
        await interaction.reply(`✅ تم تحديد القناة: ${channel} لإرسال الستوك تلقائيًا.`);
    }
});

// الاتصال بالـ WebSocket الخاص بـ GAG Stock
const ws = new WebSocket('wss://gagstock.gleeze.com');

ws.on('open', () => {
    console.log('🌐 متصل بالـ GAG Stock WebSocket');
});

ws.on('message', async (data) => {
    try {
        const parsed = JSON.parse(data);

        if (!targetChannelId) return; // ما فيه قناة محددة بعد

        const stockData = parsed.data;
        if (!stockData) return;

        let stockMessage = '📦 **الستوك الحالي:**\n';
        Object.keys(stockData).forEach(category => {
            const items = stockData[category].items.map(item => `${item.emoji} ${item.name}: ${item.quantity}`).join('\n');
            stockMessage += `\n**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n${items}\n`;
        });

        const channel = await client.channels.fetch(targetChannelId);
        channel.send(stockMessage);

    } catch (err) {
        console.error('❌ خطأ عند استقبال التحديث:', err);
    }
});

client.login(TOKEN);        let stockMessage = '📦 الستوك الحالي:\n';
        Object.keys(stockData).forEach(category => {
            const items = stockData[category].items.map(item => `${item.emoji} ${item.name}: ${item.quantity}`).join('\n');
            stockMessage += `\n**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n${items}\n`;
        });

        return stockMessage;
    } catch (error) {
        console.error(error);
        return '❌ حدث خطأ أثناء جلب البيانات.';
    }
}

// عند تنفيذ أوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setstockchannel') {
        const channel = interaction.options.getChannel('channel');
        targetChannelId = channel.id;

        await interaction.reply(`✅ تم تحديد القناة: ${channel} لإرسال الستوك تلقائيًا.`);

        // أرسل الستوك مباشرة بعد تحديد القناة
        const stockMessage = await getStockData();
        channel.send(stockMessage);
    }
});

// تحديث دوري كل 10 دقائق
setInterval(async () => {
    if (targetChannelId) {
        const channel = await client.channels.fetch(targetChannelId);
        const stockMessage = await getStockData();
        channel.send(stockMessage);
    }
}, 600000); // كل 10 دقائق

client.login(TOKEN);
