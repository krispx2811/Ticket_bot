const fs = require('fs');
const path = require('path');
const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const token = 'TOKEN';
const guildId = 'ID';
const categoryId = {
    report: '1079715998690713658',
    reputation: '1079715998690713651',
    middleman: '1079715998690713653',
    claimgiveaway: '1079715998690713659',
    nomm: '1194335452170305777',
    promo: '1198956350777069630'
};
const logChannelId = {
    report: '1079715999412133978',
    reputation: '1079715999412133979',
    middleman: '1079715999135322161',
    claimgiveaway: '1243259782236864594',
    nomm: '1194343542290649139',
    promo: '1198964871996391535'
};

const roleMentions = {
    report: '1079715998162227268',
    middleman: '1079715998162227266'
};

const ticketRoles = [
    '1079715998162227266',
    '1079715998162227267',
    '1079715998162227268',
    '1079715998162227269'
];

const ticketCounterFile = 'Ticketbot/ticketCounters.json';
let ticketCounters = {
    report: 1,
    reputation: 1,
    middleman: 1,
    claimgiveaway: 1,
    nomm: 1,
    promo: 1
};

// Load ticket counters from file
if (fs.existsSync(ticketCounterFile)) {
    const data = fs.readFileSync(ticketCounterFile, 'utf8');
    ticketCounters = JSON.parse(data);
}

// Save ticket counters to file
function saveTicketCounters() {
    fs.writeFileSync(ticketCounterFile, JSON.stringify(ticketCounters), 'utf8');
}

// Ensure transcript folders exist
function ensureFoldersExist() {
    const categories = Object.keys(categoryId);
    for (const category of categories) {
        const folderPath = path.join(__dirname, category);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }
}

ensureFoldersExist();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Available Categories and IDs:");
    for (const [key, value] of Object.entries(categoryId)) {
        console.log(`${key}: ${value}`);
    }
});

const ticketUserMap = new Map();

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId, user, guild } = interaction;

    if (customId.startsWith('create_ticket')) {
        const ticketType = customId.split('_')[2];
        const ticketNumber = String(ticketCounters[ticketType]).padStart(6, '0');
        const parentId = categoryId[ticketType];

        if (!parentId) {
            return interaction.reply({ content: `Error: Invalid category ID for ticket type ${ticketType}.`, ephemeral: true });
        }

        const category = guild.channels.cache.get(parentId);
        if (!category) {
            return interaction.reply({ content: `Error: Category ID ${parentId} for ticket type ${ticketType} does not exist.`, ephemeral: true });
        }

        const permissionOverwrites = [
            {
                id: guild.roles.everyone,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: user.id,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
            }
        ];

        // Add specific roles to the permission overwrites
        for (const roleId of ticketRoles) {
            permissionOverwrites.push({
                id: roleId,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
            });
        }

        const ticketChannel = await guild.channels.create(`${ticketType}-${ticketNumber}`, {
            type: 'GUILD_TEXT',
            parent: parentId,
            permissionOverwrites: permissionOverwrites,
        });

        ticketUserMap.set(ticketChannel.id, [user.id]);

        const embedDescriptions = {
            middleman: `
🤝 **Middleman Trade Request**

To include a user to the ticket, you can utilize either of the following slash commands: !add {DiscordID or Name}

👤User's Discord ID: [Insert Discord ID]
🏰 Server/Realm: [Insert Server Name]
🎁 Items to be Traded: [List of items]
`,
            report: `
⚠️ **Report Ticket**

👤 User ID: [Insert User ID]
📝 Reason for Report: [Provide a detailed explanation of the issue]

📷 Please submit any relevant screenshots or videos as evidence to support your report.
`,
            reputation: `
📋 **Apply Rep Ticket**

🔒 **Important Information:**

• Rep transfers from other servers are not permitted. 🚫
• Rep transfers are only allowed for terminated Discord accounts.
• Proof of ownership for the terminated account is required. 📄
`,
            nomm: `
🌐 **Welcome to No MM Trade**
1️⃣ To initiate a trade, use the command: !add {DiscordID}

🤝 Utilize this channel for negotiating prices and discussing trade details. Make sure to adhere to the rules.

🛡️ Trade safely! Consider reaching out to Middlemen (MM) if available for added security.

💼 **Suggestions for safe trading:**
   - Check each other's reputation in #Reputation channel using /rep-check
   - Verify member information
   - Check if Member has the @verfied role 

📜 **Remember to follow the rules and trade responsibly. Happy trading!**

👉 Please write in English language.
`,
            promo: `
Please choose one of the following that you'd like to inquire about:
- Discord ranks 🎖️
- Discord Promotion/Ads 📣

💳 **PayPal Payments Only!**
Secure your spot now with PayPal payments at this link [Click me](https://mee6.xyz/en/m/1079715998111899709). 💼

💎 **Crypto Payment Accepted!**
Send your payment to this address: 0xc56f01F0D841B9693aE527874fcE3f45C5e9A489 
`,
            claimgiveaway: `
🎉 **Giveaway Claim!**
Congratulations on winning the giveaway!
Please provide your in-game name to ensure a smooth delivery.
Your prize is being processed. Thank you for your patience! 🎁
`
        };

        const embed = new MessageEmbed()
            .setTitle('Ticket')
            .setDescription(embedDescriptions[ticketType])
            .setColor('BLUE');

        const row1 = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle('DANGER')
        );

        if (ticketType === 'report' || ticketType === 'middleman') {
            await ticketChannel.send({ content: `<@&${roleMentions[ticketType]}>`, embeds: [embed], components: [row1] });
        } else {
            await ticketChannel.send({ embeds: [embed], components: [row1] });
        }

        await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });

        ticketCounters[ticketType]++;
        saveTicketCounters();
    }

    if (customId === 'close_ticket') {
        const closeEmbed = new MessageEmbed()
            .setTitle('Ticket Closed')
            .setDescription('This ticket has been closed. You can reopen or finalize the closure.')
            .setColor('RED');

        const row2 = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('reopen_ticket')
                .setLabel('Reopen Ticket')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('finalize_ticket')
                .setLabel('Finalize Closure')
                .setStyle('DANGER')
        );

        await interaction.channel.send({ embeds: [closeEmbed], components: [row2] });

        // Lock the ticket channel for the user
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            SEND_MESSAGES: false
        });
    }

    if (customId === 'reopen_ticket') {
        await interaction.reply({ content: 'This ticket has been reopened.', ephemeral: true });

        const reopenEmbed = new MessageEmbed()
            .setTitle('Ticket Reopened')
            .setDescription('This ticket has been reopened.')
            .setColor('GREEN');

        const row3 = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle('DANGER')
        );

        await interaction.message.edit({ embeds: [reopenEmbed], components: [row3] });

        // Unlock the ticket channel for the user
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            SEND_MESSAGES: true
        });
    }

    if (customId === 'finalize_ticket') {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcriptHTML = await generateTranscriptHTML(messages, interaction.channel.name);

        const channelName = interaction.channel.name.split('-')[0];
        const transcriptChannel = guild.channels.cache.get(logChannelId[channelName]);
        const attachment = Buffer.from(transcriptHTML, 'utf-8');

        await transcriptChannel.send({
            content: `Transcript for ticket ${interaction.channel.name}`,
            files: [{ attachment, name: `${interaction.channel.name}.html` }],
        });

        const userIds = ticketUserMap.get(interaction.channel.id) || [];

        for (const userId of userIds) {
            const user = await client.users.fetch(userId);
            await user.send({
                content: `Here is the transcript for your ticket: ${interaction.channel.name}`,
                files: [{ attachment, name: `${interaction.channel.name}.html` }],
            });
        }

        await interaction.reply({ content: 'This ticket has been permanently closed.', ephemeral: true });

        await interaction.channel.send('This ticket has been permanently closed and will now be deleted.');

        // Save transcript to local file
        const folderPath = path.join(__dirname, channelName);
        const filePath = path.join(folderPath, `${interaction.channel.name}.html`);
        fs.writeFileSync(filePath, transcriptHTML, 'utf8');

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before deleting

        await interaction.channel.delete();
    }
});

client.on('messageCreate', async message => {
    if (message.content === '!ticket') {
        // Check if the user has the 'ADMINISTRATOR' permission
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        const embed = new MessageEmbed()
            .setTitle('🛎️ Information')
            .setDescription(`
Do you need help with something?

Please react to the correct category to create a ticket.

Report a Player/Issue: ⚠️
Apply for rep roles: 📋
Middleman request: 🤝
Claim Giveaway: 🎁
Trade with no Middleman: ⚖️
Donation/promotion inquiry: 📊

React with the corresponding emoji to create your ticket!
            `)
            .setColor('GREEN');

        const row1 = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('create_ticket_report')
                .setLabel('⚠️ Report Tickets')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('create_ticket_reputation')
                .setLabel('📋 Apply for rep roles')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('create_ticket_middleman')
                .setLabel('🤝 Middleman request')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('create_ticket_claimgiveaway')
                .setLabel('🎁 Giveaway Claim')
                .setStyle('PRIMARY')
        );

        const row2 = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('create_ticket_nomm')
                .setLabel('⚖️ Trade with no Middleman')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('create_ticket_promo')
                .setLabel('📊 Promo/dono inquiry')
                .setStyle('PRIMARY')
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2] });
    }

    if (message.content.startsWith('!add')) {
        const args = message.content.split(' ');
        if (args.length < 2) {
            return message.reply('Please provide a user to add to the ticket.');
        }

        const userId = args[1].replace(/[<@!>]/g, ''); // Remove any extraneous characters
        const user = await message.guild.members.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('Could not find the user. Please provide a valid user mention or ID.');
        }

        if (message.channel.name.includes('ticket')) {
            await message.channel.permissionOverwrites.edit(user.id, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                READ_MESSAGE_HISTORY: true
            });

            const userIds = ticketUserMap.get(message.channel.id) || [];
            userIds.push(user.id);
            ticketUserMap.set(message.channel.id, userIds);

            await message.channel.send(`Added ${user} to the ticket.`);
        } else {
            await message.channel.send('This command can only be used inside a ticket channel.');
        }
    }
});

async function generateTranscriptHTML(messages, channelName) {
    let transcriptHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transcript - ${channelName}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Nunito', sans-serif;
                background-color: var(--background-color);
                color: var(--text-color);
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                padding: 20px;
                transition: background-color 0.3s, color 0.3s;
            }
            .light-mode {
                --background-color: #f5f5f5;
                --text-color: #333;
                --container-background: #fff;
                --message-background: #e0e0e0;
                --link-color: #0066cc;
                --mention-background: #d0eaff;
                --mention-color: #007acc;
            }
            .dark-mode {
                --background-color: #2f3136;
                --text-color: #ccc;
                --container-background: #36393f;
                --message-background: #40444b;
                --link-color: #7289da;
                --mention-background: #2e3136;
                --mention-color: #7289da;
            }
            .container {
                width: 100%;
                max-width: 900px;
                background: var(--container-background);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                overflow: hidden;
            }
            .title {
                text-align: center;
                font-weight: bold;
                font-size: 28px;
                margin-bottom: 20px;
                color: var(--text-color);
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--background-color);
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                color: var(--text-color);
            }
            .message {
                display: flex;
                align-items: flex-start;
                margin-bottom: 25px;
                padding: 10px;
                border-radius: 8px;
                background: var(--message-background);
            }
            .avatar {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                margin-right: 15px;
            }
            .content {
                max-width: 800px;
                background: var(--message-background);
                padding: 10px 15px;
                border-radius: 8px;
                position: relative;
            }
            .content:before {
                content: '';
                position: absolute;
                top: 10px;
                left: -10px;
                width: 0;
                height: 0;
                border: 10px solid transparent;
                border-right-color: var(--message-background);
            }
            .author {
                font-weight: bold;
                color: var(--text-color);
                margin-right: 10px;
                display: block;
            }
            .timestamp {
                color: #72767d;
                font-size: 12px;
                display: block;
                margin-top: 2px;
            }
            .content-text {
                margin-top: 5px;
                color: var(--text-color);
            }
            .content-text .link {
                color: var(--link-color);
                text-decoration: underline;
            }
            .content-text .mention {
                color: var(--mention-color);
                background-color: var(--mention-background);
                padding: 2px 5px;
                border-radius: 5px;
            }
            .content-text img {
                max-width: 100%;
                border-radius: 8px;
                margin-top: 10px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            .reaction {
                display: inline-block;
                background-color: var(--message-background);
                border-radius: 5px;
                padding: 2px 6px;
                margin-top: 10px;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                margin-right: 10px;
            }
            .reaction img {
                width: 16px;
                height: 16px;
                vertical-align: middle;
                margin-right: 5px;
            }
            .reaction-count {
                vertical-align: middle;
                font-size: 14px;
            }
            .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid var(--background-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #72767d;
                font-size: 14px;
            }
            .footer-left {
                display: flex;
                align-items: center;
            }
            .footer-right {
                display: flex;
                align-items: center;
            }
            .footer .fa-discord {
                margin-left: 10px;
                color: var(--link-color);
                font-size: 20px;
            }
            .footer .fa-discord:hover {
                color: var(--link-hover-color);
            }
        </style>
    </head>
    <body class="dark-mode">
        <div class="container">
            <div class="title">BMO TICKET SYSTEM</div>
            <div class="header">
                <h1>${channelName} Transcript</h1>
            </div>
    `;

    const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const msg of sortedMessages) {
        const avatarUrl = msg.author.displayAvatarURL({ format: 'png', dynamic: true, size: 64 });
        const messageContent = msg.content.replace(/https?:\/\/\S+/g, '<a class="link" href="$&">$&</a>');
        const reactionsHTML = msg.reactions.cache.map(reaction => `
            <div class="reaction">
                <img src="${reaction.emoji.url}" alt="emoji">
                <span class="reaction-count">${reaction.count}</span>
            </div>
        `).join('');

        transcriptHTML += `
        <div class="message">
            <img src="${avatarUrl}" alt="${msg.author.tag}'s avatar" class="avatar">
            <div class="content">
                <span class="author">${msg.author.tag}</span>
                <span class="timestamp">${new Date(msg.createdTimestamp).toLocaleString()}</span>
                <div class="content-text">${messageContent}</div>
                ${reactionsHTML ? `<div class="reactions">${reactionsHTML}</div>` : ''}
            </div>
        </div>
        `;
    }

    transcriptHTML += `
            <div class="footer">
                <div class="footer-left">
                    <span>&copy; 2024 BMO Ticket System</span>
                </div>
                <div class="footer-right">
                    <span>Ticket bot made by Bittensor</span>
                    <a href="https://discord.gg/bmo" target="_blank"><i class="fab fa-discord"></i></a>
                    <a href="https://discord.gg/qagZP22fXP" target="_blank"><i class="fab fa-discord"></i></a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    return transcriptHTML;
}



module.exports = { generateTranscriptHTML };

client.login(token);
