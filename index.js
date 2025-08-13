const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server is running.'));

const token = process.env.TOKEN;
const clientId = '1392084340145524757';
const sourceGuildId = '1267563466508603473'; // السيرفر المصدر (يأخذ منه الرسائل)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    presence: {
        status: 'online',
        activities: [{ name: 'نقل الرسائل', type: 3 }]
    }
});

// خريطة لحفظ القنوات المستهدفة لكل أمر
const forwardingChannels = new Map();

// خريطة ربط الأوامر بالقنوات المصدر
const sourceChannels = {
    'شوب-الايڤنت': '1405128370634756146',
    'شوب-الفواكه-والجير': '1390525017250594986', 
    'الطقس': '1405126517054509098',
    'شوب-البيض': '1405128412443578398'
};

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // تسجيل أوامر سلاش عالمياً (في جميع السيرفرات)
    const commands = [
        new SlashCommandBuilder()
            .setName('شوب-الايڤنت')
            .setDescription('تفعيل نقل رسائل شوب الايڤنت')
            .addChannelOption(option => 
                option.setName('channel')
                      .setDescription('القناة التي ستستقبل الرسائل')
                      .setRequired(true)
                      .addChannelTypes(ChannelType.GuildText)
            ),

        new SlashCommandBuilder()
            .setName('شوب-الفواكه-والجير')
            .setDescription('تفعيل نقل رسائل شوب الفواكه والجير')
            .addChannelOption(option => 
                option.setName('channel')
                      .setDescription('القناة التي ستستقبل الرسائل')
                      .setRequired(true)
                      .addChannelTypes(ChannelType.GuildText)
            ),

        new SlashCommandBuilder()
            .setName('الطقس')
            .setDescription('تفعيل نقل رسائل الطقس')
            .addChannelOption(option => 
                option.setName('channel')
                      .setDescription('القناة التي ستستقبل الرسائل')
                      .setRequired(true)
                      .addChannelTypes(ChannelType.GuildText)
            ),

        new SlashCommandBuilder()
            .setName('شوب-البيض')
            .setDescription('تفعيل نقل رسائل شوب البيض')
            .addChannelOption(option => 
                option.setName('channel')
                      .setDescription('القناة التي ستستقبل الرسائل')
                      .setRequired(true)
                      .addChannelTypes(ChannelType.GuildText)
            ),

        new SlashCommandBuilder()
            .setName('ايقاف-النقل')
            .setDescription('إيقاف نقل الرسائل')
            .addStringOption(option =>
                option.setName('نوع')
                      .setDescription('نوع النقل المراد إيقافه')
                      .setRequired(true)
                      .addChoices(
                          { name: 'شوب الايڤنت', value: 'شوب-الايڤنت' },
                          { name: 'شوب الفواكه والجير', value: 'شوب-الفواكه-والجير' },
                          { name: 'الطقس', value: 'الطقس' },
                          { name: 'شوب البيض', value: 'شوب-البيض' },
                          { name: 'جميع الأنواع', value: 'الكل' }
                      )
            ),

        new SlashCommandBuilder()
            .setName('حالة-النقل')
            .setDescription('عرض حالة جميع عمليات نقل الرسائل المفعلة')
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log('⏳ Registering global slash commands...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('✅ Global slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// مراقبة الرسائل في القنوات المصدر ونقلها
client.on('messageCreate', async (message) => {
    // تجاهل رسائل البوتات
    if (message.author.bot) return;

    // التأكد من أن الرسالة من السيرفر المصدر المحدد
    if (message.guild.id !== sourceGuildId) return;

    // البحث عن القناة المصدر في خريطة الأوامر
    const commandType = Object.keys(sourceChannels).find(key => 
        sourceChannels[key] === message.channel.id
    );

    if (!commandType) return;

    // الحصول على جميع القنوات المستهدفة لهذا النوع من الأوامر
    for (const [key, targetChannelId] of forwardingChannels.entries()) {
        // التحقق من أن المفتاح يطابق نوع الأمر
        if (!key.startsWith(`${commandType}_`)) continue;

        const targetChannel = client.channels.cache.get(targetChannelId);
        if (!targetChannel) continue;

        try {
            // إنشاء Embed للرسالة المنقولة
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setAuthor({
                    name: message.author.displayName || message.author.username,
                    iconURL: message.author.displayAvatarURL()
                })
                .setDescription(message.content || 'رسالة بدون نص')
                .addFields(
                    { name: 'من القناة', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'النوع', value: commandType.replace('-', ' '), inline: true },
                    { name: 'السيرفر المصدر', value: message.guild.name, inline: true }
                )
                .setTimestamp(message.createdAt)
                .setFooter({ text: `ID: ${message.id}` });

            // إضافة الصور/المرفقات إذا وجدت
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    embed.setImage(attachment.url);
                } else {
                    embed.addFields({
                        name: 'مرفق',
                        value: `[${attachment.name}](${attachment.url})`,
                        inline: false
                    });
                }
            }

            await targetChannel.send({ embeds: [embed] });

            console.log(`📤 نقل رسالة من ${message.channel.name} (${message.guild.name}) إلى ${targetChannel.name} (${targetChannel.guild.name})`);

        } catch (error) {
            console.error('خطأ في نقل الرسالة:', error);
        }
    }
});

// معالجة أوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const commandName = interaction.commandName;

        // معالجة أوامر تفعيل النقل
        if (sourceChannels[commandName]) {
            // التحقق من الصلاحيات
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({
                    content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
                    ephemeral: true
                });
            }

            const targetChannel = interaction.options.getChannel('channel');

            // التأكد من أن القناة المستهدفة نصية
            if (targetChannel.type !== ChannelType.GuildText) {
                return interaction.reply({
                    content: '❌ يجب أن تكون القناة المستهدفة قناة نصية.',
                    ephemeral: true
                });
            }

            // التأكد من أن البوت يستطيع الإرسال في القناة المستهدفة
            const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
            if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
                return interaction.reply({
                    content: '❌ البوت لا يملك صلاحية الإرسال في القناة المستهدفة.',
                    ephemeral: true
                });
            }

            // إنشاء مفتاح فريد للقناة المستهدفة
            const uniqueKey = `${commandName}_${interaction.guild.id}_${targetChannel.id}`;

            // حفظ القناة المستهدفة
            forwardingChannels.set(uniqueKey, targetChannel.id);

            // الحصول على السيرفر المصدر للعرض
            const sourceGuild = client.guilds.cache.get(sourceGuildId);
            const sourceChannel = sourceGuild ? sourceGuild.channels.cache.get(sourceChannels[commandName]) : null;

            await interaction.reply({
                content: `✅ تم تفعيل نقل رسائل **${commandName.replace('-', ' ')}** إلى ${targetChannel}\n\n📍 القناة المصدر: ${sourceChannel ? `<#${sourceChannel.id}>` : 'غير متاح'} (${sourceGuild ? sourceGuild.name : 'غير متاح'})\n📍 القناة المستهدفة: ${targetChannel} (${interaction.guild.name})`,
                ephemeral: true
            });

            console.log(`✅ تم تفعيل نقل ${commandName} من ${sourceGuild?.name} إلى ${targetChannel.name} (${interaction.guild.name})`);
        }

        // معالجة أمر إيقاف النقل
        else if (commandName === 'ايقاف-النقل') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({
                    content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.',
                    ephemeral: true
                });
            }

            const type = interaction.options.getString('نوع');

            if (type === 'الكل') {
                // حذف جميع عمليات النقل للسيرفر الحالي
                const keysToDelete = [];
                for (const [key] of forwardingChannels.entries()) {
                    if (key.includes(`_${interaction.guild.id}_`)) {
                        keysToDelete.push(key);
                    }
                }
                
                keysToDelete.forEach(key => forwardingChannels.delete(key));
                
                await interaction.reply({
                    content: `✅ تم إيقاف جميع عمليات نقل الرسائل في هذا السيرفر. (${keysToDelete.length} عملية)`,
                    ephemeral: true
                });
            } else {
                // البحث عن المفتاح المحدد لهذا السيرفر
                const keyToDelete = Array.from(forwardingChannels.keys()).find(key => 
                    key.startsWith(`${type}_${interaction.guild.id}_`)
                );

                if (keyToDelete) {
                    forwardingChannels.delete(keyToDelete);
                    await interaction.reply({
                        content: `✅ تم إيقاف نقل رسائل **${type.replace('-', ' ')}** في هذا السيرفر.`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ نقل رسائل **${type.replace('-', ' ')}** غير مفعل في هذا السيرفر.`,
                        ephemeral: true
                    });
                }
            }
        }

        // معالجة أمر عرض الحالة
        else if (commandName === 'حالة-النقل') {
            const activeForwardings = [];
            
            for (const [key, channelId] of forwardingChannels.entries()) {
                if (key.includes(`_${interaction.guild.id}_`)) {
                    const [type, , ] = key.split('_');
                    const channel = client.channels.cache.get(channelId);
                    if (channel) {
                        activeForwardings.push(`• **${type.replace('-', ' ')}** ← ${channel}`);
                    }
                }
            }

            if (activeForwardings.length === 0) {
                await interaction.reply({
                    content: '❌ لا توجد عمليات نقل مفعلة في هذا السيرفر.',
                    ephemeral: true
                });
            } else {
                const sourceGuild = client.guilds.cache.get(sourceGuildId);
                await interaction.reply({
                    content: `📊 **عمليات النقل المفعلة:**\n\n${activeForwardings.join('\n')}\n\n📍 **السيرفر المصدر:** ${sourceGuild ? sourceGuild.name : 'غير متاح'}`,
                    ephemeral: true
                });
            }
        }

    } catch (error) {
        console.error('خطأ في معالجة الأمر:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تنفيذ الأمر.',
                ephemeral: true
            });
        }
    }
});

// معالجة الأخطاء
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

client.login(token);
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
