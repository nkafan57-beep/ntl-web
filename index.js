const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server is running.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ],
    presence: {
        status: 'online',
        activities: [{ name: 'استغفر الله', type: 3 }]
    }
});

const token = process.env.TOKEN;

const phrases = [
    "استغفر الله",
    "الحمد لله",
    "لا إله إلا الله",
    "الله أكبر",
    "سبحان الله",
    "أعوذ بالله من الشيطان الرجيم",
    "بسم الله الرحمن الرحيم",
    "قل هو الله أحد",
    "الله لا إله إلا هو الحي القيوم"
];

// آيات مختارة (ممكن تضيف أكثر لو تحب)
const ayat = [
    "﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا﴾",
    "﴿وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ﴾",
    "﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾",
    "﴿وَرَفَعْنَا لَكَ ذِكْرَكَ﴾",
    "﴿فَصْلِ لِلَّذِينَ يُؤْمِنُونَ﴾"
];

let currentIndex = 0;

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    setInterval(() => {
        // نختار عشوائي: هل نكتب عبارة ولا آية؟
        const writeAyah = Math.random() < 0.3; // 30% فرصة تكتب آية

        const statusText = writeAyah
            ? ayat[Math.floor(Math.random() * ayat.length)]
            : phrases[currentIndex++ % phrases.length];

        client.user.setPresence({
            activities: [{ name: statusText, type: 3 }],
            status: 'online'
        });
    }, 3000);
});

client.on('messageCreate', (message) => {
    if (message.content === 'ping') {
        message.reply('Pong!');
    }
});

client.login(token);
