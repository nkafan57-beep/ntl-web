const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const TOKEN = process.env.DISCORD_TOKEN;

// متغير لتخزين القناة المحددة
let targetChannelId = null;

// تسجيل أمر السلاش ديناميكي عند تشغيل البوت
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

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
    console.log('✅ أمر السلاش جاهز للاستخدام على أي سيرفر.');
});

// دالة لجلب الستوك
async function getStockData() {
    try {
        const response = await axios.get('https://gagstock.gleeze.com/grow-a-garden');
        const stockData = response.data.data;

        let stockMessage = '📦 الستوك الحالي:\n';
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
