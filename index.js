const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// نقرأ التوكن من Environment Variable باسم DISCORD_TOKEN
const TOKEN = process.env.DISCORD_TOKEN;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content === '!stock') {
        try {
            const response = await axios.get('https://gagstock.gleeze.com/grow-a-garden');
            const stockData = response.data.data;
            let stockMessage = '📦 الستوك الحالي:\n';

            Object.keys(stockData).forEach(category => {
                const items = stockData[category].items.map(item => `${item.emoji} ${item.name}: ${item.quantity}`).join('\n');
                stockMessage += `\n**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n${items}\n`;
            });

            message.channel.send(stockMessage);
        } catch (error) {
            console.error(error);
            message.channel.send('❌ حدث خطأ أثناء جلب البيانات.');
        }
    }
});

// تسجيل الدخول
client.login(TOKEN);
