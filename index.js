const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();

// سيرفر بسيط يمنع Render من إطفاء البوت
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server is running.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// التوكن من Environment Variables
const token = process.env.TOKEN;

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    if (message.content === 'ping') {
        message.reply('Pong!');
    }
});

client.login(token);
