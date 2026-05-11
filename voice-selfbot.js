const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json'));

let reconnectInterval = null;
let client = null;

function isInternetAvailable() {
    const { execSync } = require('child_process');
    try {
        execSync('ping -c 1 -W 1 1.1.1.1', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function joinVoice(guild, channelId) {
    try {
        const existing = getVoiceConnection(guild.id);
        if (existing) existing.destroy();

        joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,

        });

        console.log('BERHASIL join voice - mode deafen');
        return true;
    } catch (err) {
        console.log('GAGAL join voice:', err.message);
        return false;
    }
}

function startReconnect(guild, channelId) {
    if (reconnectInterval) return;
    console.log('AUTO-RECONNECT AKTIF (cek tiap 5 detik)');

    reconnectInterval = setInterval(() => {
        if (isInternetAvailable()) {
            const conn = getVoiceConnection(guild.id);
            if (!conn || conn.state.status === 'disconnected') {
                console.log('Internet OK, mencoba join ulang...');
                joinVoice(guild, channelId);
            }
        }
    }, 5000);
}

client = new Client();

client.on('ready', async () => {
    console.log('\nSUDAH LOGIN:', client.user.tag);
    console.log('USER ID:', client.user.id);

    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        console.log('ERROR: Guild ID salah');
        process.exit(1);
    }

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel || channel.type !== 'GUILD_VOICE') {
        console.log('ERROR: Channel ID salah');
        process.exit(1);
    }

    console.log('TARGET:', guild.name, '->', channel.name);
    console.log('MODE: Deafen (suara output dimatikan)');
    console.log('\nKETIK "leave" LALU ENTER UNTUK STOP\n');

    joinVoice(guild, config.channelId);
    startReconnect(guild, config.channelId);
});

client.on('disconnect', () => {
    console.log('Discord terputus, menunggu...');
});

process.stdin.on('data', (data) => {
    if (data.toString().trim().toLowerCase() === 'leave') {
        console.log('Keluar...');
        if (reconnectInterval) clearInterval(reconnectInterval);
        const conn = getVoiceConnection(config.guildId);
        if (conn) conn.destroy();
        client.destroy();
        process.exit(0);
    }
});

client.login(config.token).catch((e) => {
    console.log('ERROR: Token salah atau expired', e.message);
    process.exit(1);
});
