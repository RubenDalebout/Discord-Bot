require('dotenv').config(); // Import dotenv config
const Discord = require('discord.js'); // Import the discord.js module
const config = require('./config.json'); // Import the config.json file

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
    ],
});

// On client ready do something
client.on('ready', () => {
    // Send an console log to check which bot we are
    console.log(`Logged in as ${client.user.tag}!`);

    // Set the bot's status using data from the config.json file
    client.user.setPresence({
        activities: [{
            name: config.bot.status.message,
            type: Discord.ActivityType[config.bot.status.type]
        }],
        status: config.bot.status.state,
    });
});

client.on('guildMemberAdd', (member) => {
    // Get the channel with the specified ID
    const channel = client.channels.cache.get('1007377788132663448');

    // Create a new embed message
    const WelcomeEmbed = new Discord.EmbedBuilder()
    .setColor(config.bot.colors.primary)
    .setTitle(config.embeds.welcome.title)
    .setDescription(config.embeds.welcome.description.replace('{userID}', `<@${member.user.id}>`))
    .setThumbnail(config.bot.avatar)
    .setTimestamp()
    .setFooter({ 
        text: config.server.name, 
    });

    // Send the embed message to the specified channel
    channel.send({ embeds: [WelcomeEmbed] });
});

client.login(process.env.BOT_TOKEN); // Log in to the bot using the specified token