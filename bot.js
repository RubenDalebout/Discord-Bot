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

const commands = [
	{
		name: 'ping',
		description: 'Replies with Pong!',
	}
]

const rest = new Discord.REST({version: '10'}).setToken(process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(Discord.Routes.applicationGuildCommands("1052948545818345574", "1007372910903693553"), {body: commands});

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();


// On client ready do something
client.on('ready', () => {
    // Send an console log to check which bot we are
    console.log(`Logged in as ${client.user.tag}!`);

    // Set the bot's status using data from the config.json file
    client.user.setPresence({
        activities: [{
            name: config.bot.status.message,
            type: Discord.ActivityType.Watching
        }],
        status: config.bot.status.state,
    });
});

client.on('interactionCreate', (interaction) => {
	if (interaction.isChatInputCommand()) {
		interaction.reply({content: 'Pong'});
	}
})

client.on('guildMemberAdd', (member) => {
    // Get the channel with the specified ID
    const channel = client.channels.cache.get('1007377788132663448');

    // Create a new embed message
    const WelcomeEmbed = new Discord.EmbedBuilder()
        .setColor(config.bot.colors.primary)
        .setTitle(config.embeds.welcome.title)
        .setDescription(config.embeds.welcome.description.replace('{userID}', `<@${member.user.id}>`))
        .setThumbnail(member.user.displayAvatarURL()) // Use the joined user's avatar as the thumbnail
        .setTimestamp()
        .setFooter({ 
            text: config.server.name, 
        });

    // Send the embed message to the specified channel
    channel.send({ embeds: [WelcomeEmbed] });
});

client.on('messageCreate', message => {
    if (message.content === '!rules' && message.member.roles.cache.some(role => config.embeds.rules.permission.includes(role.id))) {
        const channel = message.channel;
        const embed = new Discord.EmbedBuilder()
            .setColor(config.bot.colors.primary)
            .setTitle(config.embeds.rules.title)
            .setThumbnail(config.bot.avatar) // Use the joined user's avatar as the thumbnail
            .setDescription(`
            ${Object.values(config.embeds.rules.rows).map((row, index) => `${index+1}. ${row}`).join('\n')}

            ${config.embeds.rules.description}
            `)
            .setTimestamp()
            .setFooter({ 
                text: config.server.name, 
            });
        channel.send({embeds: [embed]}).then(() => {
            // Delete the user's message
            message.delete();
        });
    }
});

client.login(process.env.BOT_TOKEN); // Log in to the bot using the specified token