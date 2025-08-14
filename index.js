import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import WebSocket from 'ws';
import express from 'express';

// إعداد Express Server
const app = express();
const PORT = process.env.PORT || 5000;

// إعداد الصفحة الرئيسية
app.get('/', (req, res) => {
    res.json({
        status: 'البوت يعمل بنجاح ✅',
        bot_status: client.isReady() ? 'متصل' : 'غير متصل',
        websocket_status: gameData.connectionStatus,
        game_running: isGameRunning,
        last_update: gameData.lastUpdate,
        servers: client.guilds.cache.size,
        users: client.users.cache.size,
        reconnect_count: gameData.reconnectCount,
        uptime: process.uptime()
    });
});

// صفحة حالة المخزون
app.get('/stock', (req, res) => {
    res.json({
        current_stock: currentStock,
        last_update: gameData.lastUpdate,
        stock_history_count: gameData.stockHistory.length,
        game_running: isGameRunning
    });
});

// صفحة معلومات الاتصال
app.get('/connection', (req, res) => {
    res.json({
        websocket_status: gameData.connectionStatus,
        websocket_ready: ws && ws.readyState === WebSocket.OPEN,
        reconnect_count: gameData.reconnectCount,
        jstudio_key_set: !!JSTUDIO_KEY
    });
});

// بدء تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 خادم الويب يعمل على المنفذ ${PORT}`);
    console.log(`📡 الرابط: http://0.0.0.0:${PORT}`);
});

// إعداد Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// إعداد WebSocket
const JSTUDIO_KEY = process.env.JSTUDIO_KEY;

if (!JSTUDIO_KEY) {
    console.error('❌ خطأ: مفتاح JSTUDIO_KEY غير محدد في متغيرات البيئة');
    console.log('💡 يرجى إضافة المفتاح في الـ Secrets tab');
    process.exit(1);
}
let ws;
let ReconnectInterval = 5000;
let Reconnecting = false;
let stockChannel = null;
let stockMessage = null;
let currentStock = null;
let isGameRunning = false;

// بيانات اللعبة
const gameData = {
    lastUpdate: null,
    stockHistory: [],
    reconnectCount: 0,
    connectionStatus: 'غير متصل'
};

function createWebSocketConnection() {
    console.log('[🌐] محاولة الاتصال بـ WebSocket...');

    ws = new WebSocket('wss://websocket.joshlei.com/growagarden', {
        headers: {
            'jstudio-key': JSTUDIO_KEY
        }
    });

    ws.on('open', () => {
        console.log('[✅] تم تأسيس اتصال WebSocket بنجاح!');
        gameData.connectionStatus = 'متصل';
        gameData.reconnectCount = 0;
        Reconnecting = false;

        // إرسال رسالة في Discord عن الاتصال
        if (stockChannel) {
            const connectEmbed = new EmbedBuilder()
                .setTitle('🟢 تم الاتصال بالخادم')
                .setDescription('تم تأسيس اتصال WebSocket مع خادم Grow a Garden بنجاح!')
                .addFields(
                    { name: '📡 حالة الاتصال', value: 'متصل', inline: true },
                    { name: '⏰ وقت الاتصال', value: new Date().toLocaleString('ar-SA'), inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp();

            stockChannel.send({ embeds: [connectEmbed] });
        }
    });

    ws.on('message', (data) => {
        console.log('\n[📦] رسالة جديدة من الخادم:', data.toString());

        try {
            const stockData = JSON.parse(data.toString());
            handleStockUpdate(stockData);
        } catch (error) {
            console.log('[📝] رسالة نصية:', data.toString());

            // التحقق من رسائل اللعبة
            const message = data.toString().toLowerCase();
            if (message.includes('game') || message.includes('restart') || message.includes('refresh')) {
                isGameRunning = true;
                if (stockChannel) {
                    const gameEmbed = new EmbedBuilder()
                        .setTitle('🎮 تحديث اللعبة')
                        .setDescription('تم اكتشاف تحديث في اللعبة - جاري انتظار بيانات المخزون الجديدة...')
                        .setColor('#ffa500')
                        .setTimestamp();

                    stockChannel.send({ embeds: [gameEmbed] });
                }
            }
        }
    });

    ws.on('ping', (data) => {
        console.log('[🏓] PING من الخادم');
        ws.pong(data);
    });

    ws.on('pong', (data) => {
        console.log('[🏓] PONG تم الرد');
    });

    ws.on('error', (error) => {
        console.error('[❌] خطأ في WebSocket:', error);
        gameData.connectionStatus = 'خطأ في الاتصال';
    });

    ws.on('close', (code, reason) => {
        console.log(`[<bos>] تم إغلاق اتصال WebSocket. الكود: ${code}, السبب: ${reason}`);
        gameData.connectionStatus = 'منقطع';

        if (stockChannel) {
            const disconnectEmbed = new EmbedBuilder()
                .setTitle('🔴 انقطع الاتصال')
                .setDescription('تم قطع الاتصال مع خادم Grow a Garden')
                .addFields(
                    { name: '🔢 كود الإغلاق', value: code.toString(), inline: true },
                    { name: '📝 السبب', value: reason.toString() || 'غير محدد', inline: true }
                )
                .setColor('#ff0000')
                .setTimestamp();

            stockChannel.send({ embeds: [disconnectEmbed] });
        }

        if (!Reconnecting && code !== 1000) {
            console.log(`[🔄] محاولة إعادة الاتصال خلال ${ReconnectInterval}ms...`);
            gameData.reconnectCount++;
            Reconnecting = true;
            setTimeout(createWebSocketConnection, ReconnectInterval);
        }
    });
}

function handleStockUpdate(stockData) {
    console.log('[📊] تحديث بيانات المخزون:', stockData);

    // تحديث البيانات الحالية أو دمجها
    if (!currentStock) {
        currentStock = {};
    }

    // دمج البيانات الجديدة مع الحالية
    Object.keys(stockData).forEach(key => {
        currentStock[key] = stockData[key];
    });

    gameData.lastUpdate = new Date();
    gameData.stockHistory.unshift({
        data: { ...stockData },
        timestamp: new Date()
    });

    // الاحتفاظ بآخر 10 تحديثات فقط
    if (gameData.stockHistory.length > 10) {
        gameData.stockHistory = gameData.stockHistory.slice(0, 10);
    }

    // تحديث العروض المختلفة
    updateStockDisplay();
    updateSpecificStockDisplays(stockData);
}

// تحديث العروض المخصصة للأوامر الجديدة
async function updateSpecificStockDisplays(stockData) {
    // تحديث مخزون البذور
    if (stockData.seed_stock && stockTracking.seeds.channel) {
        await updateSeedStockDisplay(stockData.seed_stock);
    }

    // تحديث مخزون الأدوات
    if (stockData.gear_stock && stockTracking.gears.channel) {
        await updateGearStockDisplay(stockData.gear_stock);
    }

    // تحديث مخزون التاجر المتنقل
    if (stockData.travelingmerchant_stock && stockTracking.merchant.channel) {
        await updateMerchantStockDisplay(stockData.travelingmerchant_stock);
    }

    // تحديث الأحداث الخاصة
    if ((stockData.event_stock || stockData.special_items) && stockTracking.events.channel) {
        await updateEventStockDisplay(stockData);
    }

    // تحديث العرض الشامل
    if (stockTracking.all.channel) {
        await updateAllStockDisplay();
    }
}

// عرض مخزون البذور
async function updateSeedStockDisplay(seedStock) {
    if (!stockTracking.seeds.channel) return;

    let filteredSeeds = seedStock;
    if (stockTracking.seeds.specificItems.length > 0) {
        filteredSeeds = seedStock.filter(seed => 
            stockTracking.seeds.specificItems.some(item => 
                seed.display_name.toLowerCase().includes(item.toLowerCase()) ||
                seed.item_id.toLowerCase().includes(item.toLowerCase())
            )
        );
    }

    if (filteredSeeds.length === 0) return;

    const embed = new EmbedBuilder()
        .setTitle('🌱 تحديث مخزون البذور')
        .setColor('#28a745')
        .setTimestamp();

    let description = '';
    filteredSeeds.forEach(seed => {
        description += `🌱 **${seed.display_name}**: ${seed.quantity}\n`;
    });

    embed.setDescription(description);
    embed.addFields(
        { name: '📊 إجمالي البذور', value: filteredSeeds.length.toString(), inline: true },
        { name: '⏰ وقت التحديث', value: new Date().toLocaleString('ar-SA'), inline: true }
    );

    let content = '';
    if (stockTracking.seeds.mentionRole) {
        content = `<@&${stockTracking.seeds.mentionRole.id}>`;
    }

    try {
        await stockTracking.seeds.channel.send({ content, embeds: [embed] });
    } catch (error) {
        console.error('[❌] خطأ في إرسال تحديث مخزون البذور:', error);
    }
}

// عرض مخزون الأدوات
async function updateGearStockDisplay(gearStock) {
    if (!stockTracking.gears.channel) return;

    let filteredGears = gearStock;
    if (stockTracking.gears.specificItems.length > 0) {
        filteredGears = gearStock.filter(gear => 
            stockTracking.gears.specificItems.some(item => 
                gear.display_name.toLowerCase().includes(item.toLowerCase()) ||
                gear.item_id.toLowerCase().includes(item.toLowerCase())
            )
        );
    }

    if (filteredGears.length === 0) return;

    const embed = new EmbedBuilder()
        .setTitle('🛠️ تحديث مخزون الأدوات')
        .setColor('#ffc107')
        .setTimestamp();

    let description = '';
    filteredGears.forEach(gear => {
        description += `🛠️ **${gear.display_name}**: ${gear.quantity}\n`;
    });

    embed.setDescription(description);
    embed.addFields(
        { name: '📊 إجمالي الأدوات', value: filteredGears.length.toString(), inline: true },
        { name: '⏰ وقت التحديث', value: new Date().toLocaleString('ar-SA'), inline: true }
    );

    let content = '';
    if (stockTracking.gears.mentionRole) {
        content = `<@&${stockTracking.gears.mentionRole.id}>`;
    }

    try {
        await stockTracking.gears.channel.send({ content, embeds: [embed] });
    } catch (error) {
        console.error('[❌] خطأ في إرسال تحديث مخزون الأدوات:', error);
    }
}

// عرض مخزون التاجر المتنقل
async function updateMerchantStockDisplay(merchantStock) {
    if (!stockTracking.merchant.channel) return;

    const embed = new EmbedBuilder()
        .setTitle(`🏪 ${merchantStock.merchantName || 'التاجر المتنقل'}`)
        .setColor('#e74c3c')
        .setTimestamp();

    let description = '';
    if (merchantStock.stock && Array.isArray(merchantStock.stock)) {
        merchantStock.stock.forEach(item => {
            description += `🛍️ **${item.display_name || item.name}**: ${item.quantity || 'متوفر'}\n`;
        });
    }

    embed.setDescription(description || 'لا توجد عناصر متوفرة حالياً');
    embed.addFields(
        { name: '📊 عدد العناصر', value: (merchantStock.stock?.length || 0).toString(), inline: true },
        { name: '⏰ وقت التحديث', value: new Date().toLocaleString('ar-SA'), inline: true }
    );

    let content = '';
    if (stockTracking.merchant.mentionRole) {
        content = `<@&${stockTracking.merchant.mentionRole.id}>`;
    }

    try {
        await stockTracking.merchant.channel.send({ content, embeds: [embed] });
    } catch (error) {
        console.error('[❌] خطأ في إرسال تحديث مخزون التاجر:', error);
    }
}

// عرض مخزون الأحداث
async function updateEventStockDisplay(stockData) {
    if (!stockTracking.events.channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🎉 تحديث مخزون الأحداث والعناصر الخاصة')
        .setColor('#9b59b6')
        .setTimestamp();

    let description = '';
    let hasEventItems = false;

    // البحث عن عناصر الأحداث
    if (stockData.event_stock && Array.isArray(stockData.event_stock)) {
        stockData.event_stock.forEach(item => {
            description += `🎉 **${item.display_name}**: ${item.quantity}\n`;
            hasEventItems = true;
        });
    }

    if (stockData.special_items && Array.isArray(stockData.special_items)) {
        stockData.special_items.forEach(item => {
            description += `⭐ **${item.display_name}**: ${item.quantity}\n`;
            hasEventItems = true;
        });
    }

    if (!hasEventItems) {
        description = 'لا توجد عناصر أحداث خاصة متوفرة حالياً';
    }

    embed.setDescription(description);
    embed.addFields(
        { name: '⏰ وقت التحديث', value: new Date().toLocaleString('ar-SA'), inline: true }
    );

    let content = '';
    if (stockTracking.events.mentionRole) {
        content = `<@&${stockTracking.events.mentionRole.id}>`;
    }

    try {
        await stockTracking.events.channel.send({ content, embeds: [embed] });
    } catch (error) {
        console.error('[❌] خطأ في إرسال تحديث مخزون الأحداث:', error);
    }
}

// عرض جميع أنواع المخزون
async function updateAllStockDisplay() {
    if (!stockTracking.all.channel || !currentStock) return;

    const embed = new EmbedBuilder()
        .setTitle('📦 تحديث شامل للمخزون')
        .setColor('#17a2b8')
        .setTimestamp();

    let description = '';

    // البذور
    if (currentStock.seed_stock && Array.isArray(currentStock.seed_stock)) {
        description += `**🌱 البذور (${currentStock.seed_stock.length}):**\n`;
        currentStock.seed_stock.slice(0, 5).forEach(seed => {
            description += `• ${seed.display_name}: ${seed.quantity}\n`;
        });
        if (currentStock.seed_stock.length > 5) {
            description += `... و ${currentStock.seed_stock.length - 5} بذرة أخرى\n\n`;
        } else {
            description += '\n';
        }
    }

    // الأدوات
    if (currentStock.gear_stock && Array.isArray(currentStock.gear_stock)) {
        description += `**🛠️ الأدوات (${currentStock.gear_stock.length}):**\n`;
        currentStock.gear_stock.slice(0, 5).forEach(gear => {
            description += `• ${gear.display_name}: ${gear.quantity}\n`;
        });
        if (currentStock.gear_stock.length > 5) {
            description += `... و ${currentStock.gear_stock.length - 5} أداة أخرى\n\n`;
        } else {
            description += '\n';
        }
    }

    // التاجر المتنقل
    if (currentStock.travelingmerchant_stock) {
        description += `**🏪 ${currentStock.travelingmerchant_stock.merchantName || 'التاجر المتنقل'}:**\n`;
        if (currentStock.travelingmerchant_stock.stock) {
            currentStock.travelingmerchant_stock.stock.forEach(item => {
                description += `• ${item.display_name || item.name}: ${item.quantity || 'متوفر'}\n`;
            });
        }
        description += '\n';
    }

    embed.setDescription(description || 'لا توجد بيانات مخزون متوفرة');
    embed.addFields(
        { name: '⏰ آخر تحديث', value: gameData.lastUpdate.toLocaleString('ar-SA'), inline: true },
        { name: '🎮 حالة اللعبة', value: isGameRunning ? '🟢 قيد التشغيل' : '🔴 متوقفة', inline: true }
    );

    let content = '';
    if (stockTracking.all.mentionRole) {
        content = `<@&${stockTracking.all.mentionRole.id}>`;
    }

    try {
        await stockTracking.all.channel.send({ content, embeds: [embed] });
    } catch (error) {
        console.error('[❌] خطأ في إرسال تحديث المخزون الشامل:', error);
    }
}

async function updateStockDisplay() {
    if (!stockChannel || !currentStock) return;

    // تحديد حالة اللعبة بناءً على وجود البيانات
    isGameRunning = currentStock && Object.keys(currentStock).length > 0;

    const stockEmbed = new EmbedBuilder()
        .setTitle('🌱 Grow a Garden - مخزون المتجر')
        .setDescription('آخر تحديث لمخزون البذور والأدوات')
        .setColor('#4a90e2')
        .setTimestamp();

    // عرض البيانات بشكل منظم ومختصر
    if (currentStock && typeof currentStock === 'object') {
        // معالجة البذور (seeds_stock)
        if (currentStock.seeds_stock && Array.isArray(currentStock.seeds_stock)) {
            let seedsText = '';
            currentStock.seeds_stock.forEach((seed, index) => {
                if (index < 8) { // عرض أول 8 بذور فقط لتجنب تجاوز الحد
                    seedsText += `🌱 ${seed.display_name}: **${seed.quantity}**\n`;
                }
            });
            if (currentStock.seeds_stock.length > 8) {
                seedsText += `... و ${currentStock.seeds_stock.length - 8} بذرة أخرى`;
            }
            
            if (seedsText) {
                stockEmbed.addFields({
                    name: '🌱 البذور المتوفرة',
                    value: seedsText || 'لا توجد بذور',
                    inline: false
                });
            }
        }

        // معالجة الأدوات (gear_stock)
        if (currentStock.gear_stock && Array.isArray(currentStock.gear_stock)) {
            let gearsText = '';
            currentStock.gear_stock.forEach((gear, index) => {
                if (index < 8) { // عرض أول 8 أدوات فقط
                    gearsText += `🛠️ ${gear.display_name}: **${gear.quantity}**\n`;
                }
            });
            if (currentStock.gear_stock.length > 8) {
                gearsText += `... و ${currentStock.gear_stock.length - 8} أداة أخرى`;
            }

            if (gearsText) {
                stockEmbed.addFields({
                    name: '🛠️ الأدوات المتوفرة',
                    value: gearsText || 'لا توجد أدوات',
                    inline: false
                });
            }
        }

        // عرض إحصائيات سريعة
        const seedsCount = currentStock.seeds_stock ? currentStock.seeds_stock.length : 0;
        const gearsCount = currentStock.gear_stock ? currentStock.gear_stock.length : 0;
        const totalItems = seedsCount + gearsCount;

        stockEmbed.addFields({
            name: '📊 الإحصائيات',
            value: `**إجمالي العناصر:** ${totalItems}\n**البذور:** ${seedsCount}\n**الأدوات:** ${gearsCount}`,
            inline: true
        });
    }

    // إضافة معلومات حالة النظام
    stockEmbed.addFields(
        { name: '⏰ آخر تحديث', value: gameData.lastUpdate ? gameData.lastUpdate.toLocaleString('ar-SA') : 'لم يتم التحديث بعد', inline: true },
        { name: '📡 حالة الاتصال', value: gameData.connectionStatus, inline: true },
        { name: '🎮 حالة اللعبة', value: isGameRunning ? '🟢 قيد التشغيل' : '🔴 متوقفة', inline: true },
        { name: '🔄 مرات إعادة الاتصال', value: gameData.reconnectCount.toString(), inline: true }
    );

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_stock')
                .setLabel('🔄 تحديث')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stock_history')
                .setLabel('📈 التاريخ')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('connection_info')
                .setLabel('📡 معلومات الاتصال')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('detailed_stock')
                .setLabel('📋 التفاصيل الكاملة')
                .setStyle(ButtonStyle.Danger)
        );

    try {
        if (stockMessage) {
            await stockMessage.edit({ embeds: [stockEmbed], components: [actionRow] });
        } else {
            stockMessage = await stockChannel.send({ embeds: [stockEmbed], components: [actionRow] });
        }
    } catch (error) {
        console.error('[❌] خطأ في تحديث رسالة المخزون:', error);
        // إنشاء رسالة جديدة إذا فشل التحديث
        try {
            stockMessage = await stockChannel.send({ embeds: [stockEmbed], components: [actionRow] });
        } catch (newError) {
            console.error('[❌] فشل في إنشاء رسالة جديدة:', newError);
        }
    }
}

// تسجيل أوامر Slash
async function registerSlashCommands() {
    const commands = [
        {
            name: 'seed-stock',
            description: 'إعداد تتبع مخزون البذور',
            options: [
                {
                    type: 7, // CHANNEL
                    name: 'channel',
                    description: 'اختر القناة لإرسال تحديثات مخزون البذور',
                    required: true
                },
                {
                    type: 8, // ROLE
                    name: 'mention-role',
                    description: 'اختر الرتبة لمنشنها عند التحديث',
                    required: false
                },
                {
                    type: 3, // STRING
                    name: 'specific-seeds',
                    description: 'أسماء بذور معينة للتتبع (مفصولة بفاصلة)',
                    required: false
                }
            ]
        },
        {
            name: 'gear-stock',
            description: 'إعداد تتبع مخزون الأدوات',
            options: [
                {
                    type: 7, // CHANNEL
                    name: 'channel',
                    description: 'اختر القناة لإرسال تحديثات مخزون الأدوات',
                    required: true
                },
                {
                    type: 8, // ROLE
                    name: 'mention-role',
                    description: 'اختر الرتبة لمنشنها عند التحديث',
                    required: false
                },
                {
                    type: 3, // STRING
                    name: 'specific-gears',
                    description: 'أسماء أدوات معينة للتتبع (مفصولة بفاصلة)',
                    required: false
                }
            ]
        },
        {
            name: 'event-stock',
            description: 'إعداد تتبع مخزون الأحداث والعناصر الخاصة',
            options: [
                {
                    type: 7, // CHANNEL
                    name: 'channel',
                    description: 'اختر القناة لإرسال تحديثات مخزون الأحداث',
                    required: true
                },
                {
                    type: 8, // ROLE
                    name: 'mention-role',
                    description: 'اختر الرتبة لمنشنها عند التحديث',
                    required: false
                }
            ]
        },
        {
            name: 'merchant-stock',
            description: 'إعداد تتبع مخزون التاجر المتنقل',
            options: [
                {
                    type: 7, // CHANNEL
                    name: 'channel',
                    description: 'اختر القناة لإرسال تحديثات مخزون التاجر المتنقل',
                    required: true
                },
                {
                    type: 8, // ROLE
                    name: 'mention-role',
                    description: 'اختر الرتبة لمنشنها عند التحديث',
                    required: false
                }
            ]
        },
        {
            name: 'all-stock',
            description: 'إعداد تتبع جميع أنواع المخزون',
            options: [
                {
                    type: 7, // CHANNEL
                    name: 'channel',
                    description: 'اختر القناة لإرسال جميع تحديثات المخزون',
                    required: true
                },
                {
                    type: 8, // ROLE
                    name: 'mention-role',
                    description: 'اختر الرتبة لمنشنها عند التحديث',
                    required: false
                }
            ]
        }
    ];

    try {
        console.log('🔄 بدء تسجيل أوامر Slash...');
        await client.application.commands.set(commands);
        console.log('✅ تم تسجيل أوامر Slash بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تسجيل أوامر Slash:', error);
    }
}

// إعدادات التتبع المخصصة
const stockTracking = {
    seeds: {
        channel: null,
        mentionRole: null,
        specificItems: []
    },
    gears: {
        channel: null,
        mentionRole: null,
        specificItems: []
    },
    events: {
        channel: null,
        mentionRole: null
    },
    merchant: {
        channel: null,
        mentionRole: null
    },
    all: {
        channel: null,
        mentionRole: null
    }
};

// أحداث Discord Bot
client.once('ready', async () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم ${client.user.tag}`);
    console.log(`🌐 متصل مع ${client.guilds.cache.size} سيرفر`);
    console.log(`👥 يخدم ${client.users.cache.size} مستخدم`);

    // تسجيل أوامر Slash
    await registerSlashCommands();

    // بدء اتصال WebSocket
    createWebSocketConnection();

    // بدء ping للحفاظ على الاتصال
    setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 25000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // أمر تحديد قناة المخزون
    if (message.content.startsWith('!stock-channel')) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ تحتاج صلاحيات المدير لاستخدام هذا الأمر!');
        }

        stockChannel = message.channel;

        const setupEmbed = new EmbedBuilder()
            .setTitle('✅ تم تحديد قناة المخزون')
            .setDescription('تم تحديد هذه القناة لعرض مخزون Grow a Garden')
            .addFields(
                { name: '📍 القناة', value: message.channel.toString(), inline: true },
                { name: '🌐 حالة الاتصال', value: gameData.connectionStatus, inline: true }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await message.reply({ embeds: [setupEmbed] });

        // عرض آخر بيانات إذا كانت متوفرة
        if (currentStock) {
            updateStockDisplay();
        }
    }

    // أمر معلومات الاتصال
    if (message.content.startsWith('!connection-info')) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('📡 معلومات اتصال WebSocket')
            .addFields(
                { name: '🌐 الخادم', value: 'wss://websocket.joshlei.com/growagarden', inline: false },
                { name: '📡 حالة الاتصال', value: gameData.connectionStatus, inline: true },
                { name: '🔑 مفتاح JStudio', value: JSTUDIO_KEY ? 'مُعرَّف' : 'غير مُعرَّف', inline: true },
                { name: '🔄 مرات إعادة الاتصال', value: gameData.reconnectCount.toString(), inline: true },
                { name: '⏰ آخر تحديث', value: gameData.lastUpdate ? gameData.lastUpdate.toLocaleString('ar-SA') : 'لا يوجد', inline: true },
                { name: '📊 عدد التحديثات', value: gameData.stockHistory.length.toString(), inline: true },
                { name: '🎮 حالة اللعبة', value: isGameRunning ? 'قيد التشغيل' : 'متوقفة', inline: true }
            )
            .setColor('#4a90e2')
            .setTimestamp();

        await message.reply({ embeds: [infoEmbed] });
    }
});

client.on('interactionCreate', async (interaction) => {
    // معالجة أوامر Slash
    if (interaction.isChatInputCommand()) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ تحتاج صلاحيات المدير لاستخدام هذا الأمر!', ephemeral: true });
        }

        const { commandName, options } = interaction;
        const channel = options.getChannel('channel');
        const mentionRole = options.getRole('mention-role');

        try {
            switch (commandName) {
                case 'seed-stock':
                    const specificSeeds = options.getString('specific-seeds');
                    stockTracking.seeds.channel = channel;
                    stockTracking.seeds.mentionRole = mentionRole;
                    stockTracking.seeds.specificItems = specificSeeds ? 
                        specificSeeds.split(',').map(s => s.trim()) : [];

                    const seedsEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إعداد تتبع مخزون البذور')
                        .setColor('#28a745')
                        .addFields(
                            { name: '📍 القناة', value: channel.toString(), inline: true },
                            { name: '🔔 المنشن', value: mentionRole ? mentionRole.toString() : 'لا يوجد', inline: true },
                            { name: '🌱 بذور محددة', value: stockTracking.seeds.specificItems.length > 0 ? 
                                stockTracking.seeds.specificItems.join(', ') : 'جميع البذور', inline: false }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [seedsEmbed] });

                    // عرض البيانات الحالية إذا كانت متوفرة
                    if (currentStock && currentStock.seed_stock) {
                        await updateSeedStockDisplay(currentStock.seed_stock);
                    }
                    break;

                case 'gear-stock':
                    const specificGears = options.getString('specific-gears');
                    stockTracking.gears.channel = channel;
                    stockTracking.gears.mentionRole = mentionRole;
                    stockTracking.gears.specificItems = specificGears ? 
                        specificGears.split(',').map(s => s.trim()) : [];

                    const gearsEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إعداد تتبع مخزون الأدوات')
                        .setColor('#ffc107')
                        .addFields(
                            { name: '📍 القناة', value: channel.toString(), inline: true },
                            { name: '🔔 المنشن', value: mentionRole ? mentionRole.toString() : 'لا يوجد', inline: true },
                            { name: '🛠️ أدوات محددة', value: stockTracking.gears.specificItems.length > 0 ? 
                                stockTracking.gears.specificItems.join(', ') : 'جميع الأدوات', inline: false }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [gearsEmbed] });

                    // عرض البيانات الحالية إذا كانت متوفرة
                    if (currentStock && currentStock.gear_stock) {
                        await updateGearStockDisplay(currentStock.gear_stock);
                    }
                    break;

                case 'event-stock':
                    stockTracking.events.channel = channel;
                    stockTracking.events.mentionRole = mentionRole;

                    const eventsEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إعداد تتبع مخزون الأحداث')
                        .setColor('#9b59b6')
                        .addFields(
                            { name: '📍 القناة', value: channel.toString(), inline: true },
                            { name: '🔔 المنشن', value: mentionRole ? mentionRole.toString() : 'لا يوجد', inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [eventsEmbed] });

                    // عرض البيانات الحالية إذا كانت متوفرة
                    if (currentStock && (currentStock.event_stock || currentStock.special_items)) {
                        await updateEventStockDisplay(currentStock);
                    }
                    break;

                case 'merchant-stock':
                    stockTracking.merchant.channel = channel;
                    stockTracking.merchant.mentionRole = mentionRole;

                    const merchantEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إعداد تتبع مخزون التاجر المتنقل')
                        .setColor('#e74c3c')
                        .addFields(
                            { name: '📍 القناة', value: channel.toString(), inline: true },
                            { name: '🔔 المنشن', value: mentionRole ? mentionRole.toString() : 'لا يوجد', inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [merchantEmbed] });

                    // عرض البيانات الحالية إذا كانت متوفرة
                    if (currentStock && currentStock.travelingmerchant_stock) {
                        await updateMerchantStockDisplay(currentStock.travelingmerchant_stock);
                    }
                    break;

                case 'all-stock':
                    stockTracking.all.channel = channel;
                    stockTracking.all.mentionRole = mentionRole;

                    const allEmbed = new EmbedBuilder()
                        .setTitle('✅ تم إعداد تتبع المخزون الشامل')
                        .setColor('#17a2b8')
                        .addFields(
                            { name: '📍 القناة', value: channel.toString(), inline: true },
                            { name: '🔔 المنشن', value: mentionRole ? mentionRole.toString() : 'لا يوجد', inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [allEmbed] });

                    // عرض البيانات الحالية إذا كانت متوفرة
                    if (currentStock) {
                        await updateAllStockDisplay();
                    }
                    break;
            }
        } catch (error) {
            console.error('[❌] خطأ في معالجة أمر Slash:', error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء معالجة الأمر.', ephemeral: true });
        }
        return;
    }

    if (!interaction.isButton()) return;

    try {
        switch (interaction.customId) {
            case 'refresh_stock':
                await interaction.reply({ content: '🔄 جاري تحديث بيانات المخزون...', ephemeral: true });
                if (currentStock) {
                    updateStockDisplay();
                }
                break;

            case 'stock_history':
                const historyEmbed = new EmbedBuilder()
                    .setTitle('📈 تاريخ المخزون')
                    .setDescription(`آخر ${gameData.stockHistory.length} تحديثات`)
                    .setColor('#9b59b6')
                    .setTimestamp();

                gameData.stockHistory.slice(0, 5).forEach((entry, index) => {
                    const dataPreview = JSON.stringify(entry.data).substring(0, 80) + '...';
                    historyEmbed.addFields({
                        name: `📦 تحديث #${index + 1}`,
                        value: `**الوقت:** ${entry.timestamp.toLocaleString('ar-SA')}\n**البيانات:** \`${dataPreview}\``,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [historyEmbed], ephemeral: true });
                break;

            case 'connection_info':
                const connectionEmbed = new EmbedBuilder()
                    .setTitle('📡 تفاصيل الاتصال')
                    .addFields(
                        { name: '🌐 الخادم', value: 'websocket.joshlei.com', inline: true },
                        { name: '📊 المنفذ', value: 'WSS (443)', inline: true },
                        { name: '🔑 المفتاح', value: JSTUDIO_KEY ? 'موجود' : 'مفقود', inline: true },
                        { name: '📡 حالة الاتصال', value: gameData.connectionStatus, inline: true },
                        { name: '🎮 حالة اللعبة', value: isGameRunning ? '🟢 قيد التشغيل' : '🔴 متوقفة', inline: true },
                        { name: '⚡ حالة WebSocket', value: ws && ws.readyState === WebSocket.OPEN ? '🟢 نشط' : '🔴 غير نشط', inline: true },
                        { name: '🔄 إعادة الاتصال', value: gameData.reconnectCount.toString(), inline: true },
                        { name: '📊 آخر بيانات', value: currentStock ? 'متوفرة' : 'غير متوفرة', inline: true }
                    )
                    .setColor('#17a2b8')
                    .setTimestamp();

                await interaction.reply({ embeds: [connectionEmbed], ephemeral: true });
                break;

            case 'detailed_stock':
                if (!currentStock) {
                    await interaction.reply({ content: '❌ لا توجد بيانات مخزون متاحة حالياً.', ephemeral: true });
                    return;
                }

                // إنشاء رسائل متعددة للتفاصيل الكاملة
                await interaction.reply({ content: '📋 جاري عرض التفاصيل الكاملة للمخزون...', ephemeral: true });

                // عرض البذور
                if (currentStock.seeds_stock && currentStock.seeds_stock.length > 0) {
                    const seedsEmbed = new EmbedBuilder()
                        .setTitle('🌱 تفاصيل البذور')
                        .setColor('#28a745')
                        .setTimestamp();

                    let seedsDescription = '';
                    currentStock.seeds_stock.forEach((seed, index) => {
                        seedsDescription += `**${seed.display_name}** - الكمية: ${seed.quantity}\n`;
                        if (seedsDescription.length > 1800) { // تجنب تجاوز حد Discord
                            seedsDescription += '... (المزيد من البذور متوفرة)';
                            return;
                        }
                    });

                    seedsEmbed.setDescription(seedsDescription);
                    await interaction.followUp({ embeds: [seedsEmbed], ephemeral: true });
                }

                // عرض الأدوات
                if (currentStock.gear_stock && currentStock.gear_stock.length > 0) {
                    const gearsEmbed = new EmbedBuilder()
                        .setTitle('🛠️ تفاصيل الأدوات')
                        .setColor('#ffc107')
                        .setTimestamp();

                    let gearsDescription = '';
                    currentStock.gear_stock.forEach((gear, index) => {
                        gearsDescription += `**${gear.display_name}** - الكمية: ${gear.quantity}\n`;
                        if (gearsDescription.length > 1800) {
                            gearsDescription += '... (المزيد من الأدوات متوفرة)';
                            return;
                        }
                    });

                    gearsEmbed.setDescription(gearsDescription);
                    await interaction.followUp({ embeds: [gearsEmbed], ephemeral: true });
                }

                break;
        }
    } catch (error) {
        console.error('[❌] خطأ في معالجة التفاعل:', error);
        if (!interaction.replied) {
            await interaction.reply({ content: '❌ حدث خطأ أثناء معالجة طلبك.', ephemeral: true });
        }
    }
});

// معالجة الأخطاء
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// تسجيل الدخول
const token = process.env.BOT_TOKEN;
if (!token) {
    console.log('⚠️ تحذير: BOT_TOKEN غير محدد في متغيرات البيئة');
    console.log('💡 يرجى إضافة التوكن في الـ Secrets tab');
} else {
    client.login(token).catch(error => {
        console.error('❌ فشل في تسجيل الدخول:', error);
    });
}