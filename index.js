const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server is running.'));

const token = process.env.TOKEN;
const clientId = '1375191552527433749'; // حط آي دي بوتك هنا

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    presence: {
        status: 'online',
        activities: [{ name: 'استغفر الله', type: 3 }]
    }
});

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
const ayat = [
    "﴿فَإِنَّ مَعَ الْعُسْرِ يُسْرًا﴾",
    "﴿وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ﴾",
    "﴿إِنَّ اللَّهَ مَعَ الصَّابِرِينَ﴾",
    "﴿وَرَفَعْنَا لَكَ ذِكْرَكَ﴾",
    "﴿فَصْلِ لِلَّذِينَ يُؤْمِنُونَ﴾"
];
let currentIndex = 0;

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // تسجيل أوامر سلاش عالمياً
    const commands = [
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('باند شخص')
            .addUserOption(option => option.setName('target').setDescription('الشخص للباند').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('سبب الباند')),
        new SlashCommandBuilder()
            .setName('unban')
            .setDescription('فك باند عن شخص')
            .addUserOption(option => option.setName('target').setDescription('الشخص لفك الباند').setRequired(true)),
        new SlashCommandBuilder()
            .setName('nick')
            .setDescription('تغيير نيك نيم شخص')
            .addUserOption(option => option.setName('target').setDescription('الشخص').setRequired(true))
            .addStringOption(option => option.setName('newname').setDescription('الاسم الجديد').setRequired(true)),
        new SlashCommandBuilder()
            .setName('addrole')
            .setDescription('إعطاء رتبة لشخص')
            .addUserOption(option => option.setName('target').setDescription('الشخص').setRequired(true))
            .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
        new SlashCommandBuilder()
            .setName('removerole')
            .setDescription('إزالة رتبة من شخص')
            .addUserOption(option => option.setName('target').setDescription('الشخص').setRequired(true))
            .addRoleOption(option => option.setName('role').setDescription('الرتبة').setRequired(true)),
        new SlashCommandBuilder()
            .setName('reply')
            .setDescription('إرسال رد إداري عام')
            .addStringOption(option => option.setName('message').setDescription('الرسالة').setRequired(true)),
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log('⏳ Registering slash commands globally...');
        await rest.put(
            Routes.applicationCommands(clientId), // تسجيل أوامر سلاش عالكل
            { body: commands }
        );
        console.log('✅ Slash commands registered globally!');
    } catch (error) {
        console.error(error);
    }

    setInterval(() => {
        const writeAyah = Math.random() < 0.3;
        const statusText = writeAyah
            ? ayat[Math.floor(Math.random() * ayat.length)]
            : phrases[currentIndex++ % phrases.length];

        client.user.setPresence({
            activities: [{ name: statusText, type: 3 }],
            status: 'online'
        });
    }, 3000);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild } = interaction;

    if (!member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ ما عندك صلاحية تنفذ الأمر هذا.', ephemeral: true });
    }

    if (commandName === 'ban') {
        const user = options.getUser('target');
        const reason = options.getString('reason') || 'لا يوجد سبب محدد';

        try {
            const guildMember = await guild.members.fetch(user.id);
            await guildMember.ban({ reason });
            return interaction.reply(`✅ تم باند ${user.tag} بسبب: ${reason}`);
        } catch (e) {
            return interaction.reply(`❌ فشل في باند المستخدم: ${e.message}`);
        }
    } else if (commandName === 'unban') {
        const user = options.getUser('target');
        try {
            await guild.bans.remove(user.id);
            return interaction.reply(`✅ تم فك الباند عن ${user.tag}`);
        } catch (e) {
            return interaction.reply(`❌ فشل في فك الباند: ${e.message}`);
        }
    } else if (commandName === 'nick') {
        const user = options.getUser('target');
        const newName = options.getString('newname');
        try {
            const guildMember = await guild.members.fetch(user.id);
            await guildMember.setNickname(newName);
            return interaction.reply(`✅ تم تغيير اسم ${user.tag} إلى ${newName}`);
        } catch (e) {
            return interaction.reply(`❌ فشل في تغيير الاسم: ${e.message}`);
        }
    } else if (commandName === 'addrole') {
        const user = options.getUser('target');
        const role = options.getRole('role');
        try {
            const guildMember = await guild.members.fetch(user.id);
            await guildMember.roles.add(role);
            return interaction.reply(`✅ تم إعطاء رتبة ${role.name} لـ ${user.tag}`);
        } catch (e) {
            return interaction.reply(`❌ فشل في إعطاء الرتبة: ${e.message}`);
        }
    } else if (commandName === 'removerole') {
        const user = options.getUser('target');
        const role = options.getRole('role');
        try {
            const guildMember = await guild.members.fetch(user.id);
            await guildMember.roles.remove(role);
            return interaction.reply(`✅ تم إزالة رتبة ${role.name} من ${user.tag}`);
        } catch (e) {
            return interaction.reply(`❌ فشل في إزالة الرتبة: ${e.message}`);
        }
    } else if (commandName === 'reply') {
        const message = options.getString('message');
        return interaction.reply(`📢 رد الإدارة: ${message}`);
    }
});

client.login(token);
