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
	},
    {
        name: 'embed',
        description: 'Create your own embed with our bot',
        options: [
            {
                name: 'title',
                description: 'The title of the embed',
                type: 3,
                required: true,
            },
            {
                name: 'description',
                description: `The description of the embed. To allow line breaks type backslash + n in your message`,
                type: 3,
                required: true,
            }
        ]
    },
    {
        name: 'clear',
        description: 'Clear the amount of message you provide',
        options: [
            {
                name: 'amount',
                description: 'The amount of messages you want to delete',
                type: 4,
                required: true,
            },
        ]
    },
    {
        name: 'suggestion',
        description: 'Send your suggestion for our server(s) through this command!',
        options: [
            {
                name: 'description',
                description: 'Detailed text about your suggestion.',
                type: 3,
                required: true,
            },
        ]
    },
]

const rest = new Discord.REST({version: '10'}).setToken(process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(Discord.Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), {body: commands});

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
    // Commands
	if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'ping') {
            interaction.reply({content: 'Pong'});
        }

        // Clear command
        if (interaction.commandName === 'clear') {
            // Get the number of messages to delete
            const amount = interaction.options.get('amount').value;

            // Fetch the specified number of messages in the interaction channel
            interaction.channel.messages.fetch({ limit: amount }).then(messages => {
                // Extract the message IDs from the message objects
                const messageIds = messages.map(message => message.id);

                // Delete the messages using the bulkDelete method
                interaction.channel.bulkDelete(messageIds).then(() => {
                    // Create a new embed message
                    const embed = new Discord.EmbedBuilder()
                        .setColor(config.bot.colors.primary)
                        .setTitle(config.bot.name)
                        .setDescription(config.embeds.clear.description.replace('{amount}', amount).replace('{userID}', '<@' + interaction.user.id + '>'))
                        .setTimestamp()
                        .setFooter({ 
                            text: config.server.name, 
                        });

                    // Send the embed message to the specified channel
                    interaction.channel.send({embeds: [embed]}).then(message => {
                        // Store a reference to the message object
                        const embedMessage = message;

                        // Delete the user's message
                        interaction.reply({content: 'Embed aangemaakt'}).then(() => {
                            interaction.deleteReply();
                        });

                        setTimeout(() => {
                            // Delete the embed message using the delete method
                            embedMessage.delete();
                        }, 5000);
                    });
                });
            });
        }

        // Embed command
        if (interaction.commandName === 'embed') {
            // Create a new embed message
            const embed = new Discord.EmbedBuilder()
            .setColor(config.bot.colors.primary)
            .setTitle(interaction.options.get('title').value)
            .setDescription(interaction.options.get('description').value.replace(new RegExp("\\\\n", "g"), "\n"))
            .setThumbnail(config.bot.avatar) // Use the joined user's avatar as the thumbnail
            .setTimestamp()
            .setFooter({ 
                text: config.server.name, 
            });

            // Send the embed message to the specified channel
            interaction.channel.send({embeds: [embed]}).then(() => {
                // Delete the user's message
                interaction.reply({content: 'Embed aangemaakt'}).then(() => {
                    interaction.deleteReply();
                });
            });
        }

        // Suggestion command
        if (interaction.commandName === 'suggestion') {
            // Get the number of messages to delete
            const description = interaction.options.get('description').value;
            const channel = client.channels.cache.get(config.suggestions.channel);

            // When channel is find
            if (channel) {
                // Create a new embed message
                const embed = new Discord.EmbedBuilder()
                .setColor(config.bot.colors.primary)
                .setTitle('Suggestion from ' + interaction.user.tag)
                .setDescription(description.replace(new RegExp("\\\\n", "g"), "\n"))
                .setThumbnail(config.bot.avatar) // Use the joined user's avatar as the thumbnail
                .setTimestamp()
                .setFooter({ 
                    text: config.server.name, 
                });

                // Send the embed message to the specified channel
                channel.send({embeds: [embed]}).then((message) => {
                    for (const emoji of config.suggestions.emojis) {
                        message.react(emoji);
                    }
                    // Delete the user's message
                    interaction.reply({content: 'Embed aangemaakt'}).then(() => {
                        interaction.deleteReply();
                    });
                });
            } else {
                console.error('Provided channel for suggestions does not exists!');
            }
        }
	}

    // Select menu
    if (interaction.isStringSelectMenu()) {
        // Check id from the select menu
        console.log('custom id: ' + interaction.customId)
        console.log('id: ' + interaction.id )
        console.log('name: ' + interaction.name)
        

        if (interaction.customId === 'select') {
            const value = interaction;

            console.log(`Selected opton with value: ${value}`);
        }
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

    if (message.content === '!tickets' /*&& message.member.roles.cache.some(role => config.embeds.rules.permission.includes(role.id))*/) {
        const channel = message.channel;

        const select = new Discord.StringSelectMenuBuilder()
            .setPlaceholder('Nothing selected');

        for (const option of config.embeds.tickets.options) {
            select.addOptions({
                label: option.label,
                value: option.ID,
                emoji: option.emoji.id
            });
        }

        const row = new Discord.ActionRowBuilder().addComponents(select);

        const embed = new Discord.EmbedBuilder()
            .setColor(config.bot.colors.primary)
            .setTitle(config.embeds.tickets.title)
            .setThumbnail(config.bot.avatar) // Use the joined user's avatar as the thumbnail
            .setDescription(config.embeds.tickets.description.replace(new RegExp("\\\\n", "g"), "\n"))
            .setTimestamp()
            .setFooter({ 
                text: config.server.name, 
            });
        channel.send({ embeds: [embed], components: [row] }).then(() => {
            // Delete the user's message
            message.delete();
        });

    }
       
});

client.login(process.env.BOT_TOKEN); // Log in to the bot using the specified token