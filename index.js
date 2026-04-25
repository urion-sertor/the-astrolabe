/**
 * 🧭 THE ASTROLABE - Bot
 * 
 * Status: Active - 1500s Exploration Theme
 * This bot guides diplomatic threads and umpire tools for the New World.
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- Configuration ---
const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 8080;

// Discord identifiers
const CATEGORY_ID = process.env.CATEGORY_ID
const ROLE_SPECTATOR_ID = process.env.ROLE_SPECTATOR_ID
const ROLE_UMPIRE_ID = process.env.ROLE_UMPIRE_ID
// ---------------------

// HTTP Server for Health Checks
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("The Astrolabe is oriented and active");
}).listen(PORT, () => {
    console.log(`[NAVIGATION] The Astrolabe is listening on port ${PORT}`);
});

// Register Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Locks the current diplomacy thread (Read-only for users)')
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlocks the current diplomacy thread')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`[AUTH] The Astrolabe connected as ${client.user.tag}`);
    
    // Register commands globally
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('[SYSTEM] Calibrating slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('[SYSTEM] The Astrolabe is fully calibrated.');
    } catch (error) {
        console.error('[ERROR] Calibration failed:', error);
    }
});

client.on('threadCreate', async (thread) => {
    // Check if thread belongs to the monitored jurisdiction (Diplomacy channels)
    if (thread.parentId !== CATEGORY_ID && thread.parent?.parentId !== CATEGORY_ID) return;
    
    // Safety delay to ensure Discord's internal state is synchronized
    setTimeout(async () => {
        try {
            // Invisible Pings: Invite necessary roles silently
            const inviteMsg = await thread.send(`Including roles: <@&${ROLE_SPECTATOR_ID}> <@&${ROLE_UMPIRE_ID}>`);
            console.log(`[LOG] Guiding roles to ${thread.name}`);

            // Delete the message shortly after to clear the notification bubble
            setTimeout(() => {
                inviteMsg.delete().catch(err => console.error("[ERROR] Ping removal failed:", err.message));
            }, 4000);
        } catch (e) { 
            console.error("[ERROR] threadCreate failure:", e.message); 
        }
    }, 5000);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, channel, member, user } = interaction;

    if (commandName === 'lock' || commandName === 'unlock') {
        // Ensure it's used in a thread
        if (!channel.isThread()) {
            return interaction.reply({ content: "This tool can only be used within the confines of a thread.", ephemeral: true });
        }

        // Check for Umpire Role or Admin
        const hasUmpireRole = member.roles.cache.has(ROLE_UMPIRE_ID);
        if (!hasUmpireRole && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "Only an Umpire may adjust this thread's course.", ephemeral: true });
        }

        const isLocking = commandName === 'lock';

        try {
            await channel.setLocked(isLocking);
            const action = isLocking ? "sealed" : "opened for passage";
            const emoji = isLocking ? "📜" : "🔓";
            const statusText = isLocking ? "It remains as a record, but no further entries shall be made." : "Discussion and passage may now resume.";
            
            await interaction.reply({ 
                content: `${emoji} **Diplomatic Decree:** This thread has been ${action} by an Umpire. ${statusText}` 
            });
            console.log(`[MOD] Thread ${channel.name} ${action} by ${user.tag}`);
        } catch (error) {
            console.error(`[ERROR] ${commandName} failure:`, error.message);
            await interaction.reply({ content: `Failed to adjust the thread. Ensure the Astrolabe has proper authority.`, ephemeral: true });
        }
    }
});

if (TOKEN) {
    client.login(TOKEN).catch(err => console.error("[LOGIN ERROR] Verification failed:", err.message));
} else {
    console.error("[CRITICAL] TOKEN NOT FOUND. THE ASTROLABE CANNOT NAVIGATE.");
}
