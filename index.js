require('dotenv').config(); // Import dotenv config
const fs = require('fs');

const Discord = require('discord.js'); // Import the discord.js module
const config = require('./config.json'); // Import the config.json file
// const config = require('./staging-config.json'); // Import the config.json file

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

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId == 'tickets-select') {
            const value = interaction.values[0];
            
            if (config.tickets.categories[value] !== undefined) {
                const obj = config.tickets.categories[value];
                
                // Check if category exists in obj
                if (obj.categoryID !== undefined) {
                    const categoryId = obj.categoryID;
                    const guild = client.guilds.cache.get(process.env.GUILD_ID); // Replace GUILD_ID with the actual ID of the guild
                    
                    // Get the channel with the specified ID
                    const channel = client.channels.cache.get(categoryId);

                    if (channel.type === 4) {
                        // Read and parse the tickets.json file
                        fs.readFile('./tickets.json', 'utf8', function(err, data) {
                          if (err) throw err;
                      
                          // Parse the contents of the file into a JavaScript object
                          let tickets = JSON.parse(data);
                      
                          // Initialize the tickets object as an empty array if it is currently an empty object
                          if (Object.keys(tickets).length === 0 && tickets.constructor === Object) {
                            tickets = [];
                          }
                      
                          // Check if the user already has a ticket in the tickets.json file
                          const existingTicket = tickets.find(ticket => ticket.owner === interaction.user.id);
                      
                          // If the user does not have an existing ticket, create a new one
                          if (!existingTicket) {
                            // Create the new channel within the category
                            guild.channels.create({
                                name: "ticket-" + interaction.user.tag,
                                type: Discord.ChannelType.GuildText,
                                parent: categoryId,
                                // Deny everyone access to the channel
                                permissionOverwrites: [
                                  {
                                    id: guild.id,
                                    deny: [Discord.PermissionsBitField.Flags.ViewChannel, Discord.PermissionsBitField.Flags.SendMessages, Discord.PermissionsBitField.Flags.ReadMessageHistory],
                                  },
                                  // Allow the interaction.user to view and send messages in the channel
                                  {
                                    id: interaction.user.id,
                                    allow: [Discord.PermissionsBitField.Flags.ViewChannel, Discord.PermissionsBitField.Flags.SendMessages, Discord.PermissionsBitField.Flags.ReadMessageHistory],
                                  },
                                ],
                              }).then(channel => {
                                // Add the user ID and channel information to the tickets.json file
                                tickets.push({
                                    channel: channel.id,
                                    category: value,
                                    owner: interaction.user.id,
                                    frozen: false,
                                    allowedUsers: [interaction.user.id],
                                    allowedRoles: []
                                });
                        
                                fs.writeFile('./tickets.json', JSON.stringify(tickets), 'utf8', function(err) {
                                    if (err) throw err;

                                    channel.send(`<@${interaction.user.id}>`).then((message) => {
                                        message.delete();
                                    });
                                    
                                    // Send embed message in the channel
                                    // Create a new embed message
                                    const embed = new Discord.EmbedBuilder()
                                    .setColor(config.bot.colors.primary)
                                    .setTitle(obj.embed.title)
                                    .setDescription(obj.embed.description.replace(new RegExp("\\\\n", "g"), "\n"))
                                    .setThumbnail(config.bot.avatar) // Use the joined user's avatar as the thumbnail
                                    .setTimestamp()
                                    .setFooter({ 
                                        text: config.server.name, 
                                    });

                                    const row = new Discord.ActionRowBuilder()
                                    .addComponents(
                                        new Discord.ButtonBuilder()
                                            .setCustomId('ticket-close')
                                            .setLabel('Close ticket')
                                            .setStyle(Discord.ButtonStyle.Danger)
                                            .setEmoji('🔐'),
                                        new Discord.ButtonBuilder()
                                        .setCustomId('ticket-freeze')
                                        .setLabel('Freeze ticket')
                                        .setStyle(Discord.ButtonStyle.Primary)
                                        .setEmoji('🧊'),
                                    );

                                    // Send the embed message to the specified channel
                                    channel.send({embeds: [embed], components: [row]}).then((message) => {
                                        const select = new Discord.StringSelectMenuBuilder()
                                        .setCustomId('tickets-select')
                                        .setPlaceholder('Nothing selected');

                                        for (const option of config.embeds.tickets.options) {
                                            select.addOptions({
                                                label: option.label,
                                                value: option.ID,
                                                emoji: option.emoji.id
                                            });
                                        }

                                        const updaterow = new Discord.ActionRowBuilder().addComponents(select);
                                        interaction.update({components: [updaterow]})
                                    });
                                });
                            }).catch(error => {
                              console.log(error)
                            });
                          } else {
                            // If the user already has an existing ticket, send a message indicating that they already have a ticket
                            console.log('User already has an existing ticket');
                          }
                        });
                      }
                      
                }
            }
        }
    }

    if (interaction.isButton()) {
        // Close confirm button
        if (interaction.customId === 'ticket-close-confirm') {
            // Get channel
            const channel = interaction.channel;
          
            // Read the tickets.json file
            fs.readFile('tickets.json', (err, data) => {
                if (err) throw err;
            
                // Parse the JSON data
                const tickets = JSON.parse(data);
            
                // Check if the channel is a ticket
                const ticket = tickets.find(t => t.channel === channel.id);
                if (ticket) {
                    const obj = config.tickets.categories[ticket.category];
            
                    // Check if the user has any of the specified roles
                    if (interaction.member.roles.cache.some(role => obj.roles.includes(role.id)) || interaction.member.id === ticket.owner) {
                        // Create a new array without the ticket
                        const updatedTickets = tickets.filter(t => t.channel !== ticket.channel);
                
                        // Write the updated array to the tickets.json file
                        fs.writeFile('tickets.json', JSON.stringify(updatedTickets), err => {
                            if (err) throw err;
                
                            // Delete the channel
                            channel.delete()
                            .then(() => {
                                // Get the channel object
                                const audit = client.channels.cache.get(config.tickets.audit);

                                // Create the embed object
                                const embed = new Discord.EmbedBuilder()
                                .setTitle(channel.name)
                                .setDescription(`is closed by: <@${interaction.user.id}>`)
                                .setColor(config.bot.colors.primary)
                                .setTimestamp()

                                // Send the embed message in the channel
                                audit.send({ embeds: [embed] });
                            })
                            .catch(console.error);
                        });
                    } else {
                        interaction.reply({ content: 'You do not have permissions for this', ephemeral: true });
                    }
                }
            });
        }          
        // Close button
        if (interaction.customId === 'ticket-close') {
            // Get channel
            const channel = interaction.channel;

            // Read the tickets.json file
            fs.readFile('tickets.json', (err, data) => {
                if (err) throw err;
            
                // Parse the JSON data
                const tickets = JSON.parse(data);
            
                // Check if the channel is a ticket
                const ticket = tickets.find(t => t.channel === channel.id);
                if (ticket) {
                    const obj = config.tickets.categories[ticket.category];

                    // Check if the user has any of the specified roles
                    if (interaction.member.roles.cache.some(role => obj.roles.includes(role.id)) || interaction.member.id === ticket.owner) {
                        // Create the embed message
                        const embed = new Discord.EmbedBuilder()
                        .setTitle('Close Ticket')
                        .setDescription('Are you sure you want to close this ticket?')
                        .setColor(config.bot.colors.primary)

                        // Change the style of the button component
                        const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            new Discord.ButtonBuilder()
                            .setCustomId('ticket-close-confirm')
                            .setLabel('Yes close ticket')
                            .setStyle(Discord.ButtonStyle.Danger)
                            .setEmoji('🔒'),
                        );

                        // Send the embed message
                        interaction.reply({ embeds:[embed], components: [row], ephemeral: true });      
                    } else {
                        interaction.reply({ content: 'You do not have permissions for this', ephemeral: true });
                    }
                }
            });
        }
        // Frozen button
        if (interaction.customId === 'ticket-freeze') {
            // Get channel
            const channel = interaction.channel;

            // Read the tickets.json file
            fs.readFile('tickets.json', (err, data) => {
                if (err) throw err;
            
                // Parse the JSON data
                const tickets = JSON.parse(data);
            
                // Check if the channel is a ticket
                const ticket = tickets.find(t => t.channel === channel.id);
                if (ticket) {
                    const obj = config.tickets.categories[ticket.category];

                    // Check if the user has any of the specified roles
                    if (interaction.member.roles.cache.some(role => obj.roles.includes(role.id))) {
                        // Toggle the frozen property
                        ticket.frozen = !ticket.frozen;
                    
                        // Write the updated tickets to the tickets.json file
                        fs.writeFile('tickets.json', JSON.stringify(tickets), err => {
                            if (err) throw err;

                            // console.log(channel)
                            for (const uuid of ticket.allowedUsers) {
                                // Update the permissions
                                channel.permissionOverwrites.edit(uuid, {
                                    [Discord.PermissionsBitField.Flags.SendMessages]: !ticket.frozen,
                                });
                            }

                            // Change the style of the button component
                            const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.ButtonBuilder()
                                    .setCustomId('ticket-close')
                                    .setLabel('Close ticket')
                                    .setStyle(Discord.ButtonStyle.Danger)
                                    .setEmoji('🔐'),
                                new Discord.ButtonBuilder()
                                .setCustomId('ticket-freeze')
                                .setLabel((ticket.frozen) ? "Unfreeze ticket" : "Freeze ticket")
                                .setStyle(Discord.ButtonStyle.Primary)
                                .setEmoji('🧊'),
                            );

                            interaction.update({components: [row]});
                        });
                    } else {
                        interaction.reply({ content: 'You do not have permissions for this', ephemeral: true });
                    }
                }
            });
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
            .setCustomId('tickets-select')
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