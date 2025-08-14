import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from 'discord.js';
import fetch from 'node-fetch';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const commands = [
  new SlashCommandBuilder()
    .setName('stock')
    .setDescription('يعرض الستوك في القناة المحددة')
    .addChannelOption(option =>
      option.setName('channel')
            .setDescription('اختر القناة')
            .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    console.log('🔄 تسجيل أوامر السلاش عالمياً...');
    await rest.put(
      Routes.applicationCommands(client.user.id), // أخذ ID البوت تلقائياً
      { body: commands }
    );
    console.log('✅ تم تسجيل أوامر السلاش');
  } catch (err) {
    console.error(err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stock') {
    const channel = interaction.options.getChannel('channel');

    try {
      const res = await fetch('https://gagapi-144o.onrender.com/stock');
      const data = await res.json();

      await channel.send(`📦 الستوك الحالي:\n${JSON.stringify(data)}`);
      await interaction.reply({ content: `تم إرسال الستوك في ${channel}`, ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ حدث خطأ أثناء جلب الستوك', ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
