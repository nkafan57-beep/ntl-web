const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();

// سيرفر بسيط يخلي Render يشوف إن البوت شغال
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server is running.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = 'MTM3NTE5MTU1MjUyNzQzMzc0OQ.GwwiB4.KZQYrTumTwz5NSDez76sTGgsvKtWiKvq9Juy90';

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    if (message.content === 'ping') {
        message.reply('Pong!');
    }
});

client.login(token);
