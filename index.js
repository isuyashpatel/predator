const express = require('express');
const app = express();
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Create a new client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// URL for the Hacker News top stories API
const hackerNewsAPI = 'https://hacker-news.firebaseio.com/v0/topstories.json';

// Function to fetch stories from Hacker News in the last 24 hours
async function getLast24HourStories() {
    try {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in UNIX seconds
        const twentyFourHoursAgo = currentTime - 24 * 60 * 60; // 24 hours ago

        // Fetch the top stories from Hacker News (top 100 stories)
        const topStories = await axios.get(hackerNewsAPI);
        const topStoryIds = topStories.data.slice(0, 100); // Get the top 100 story IDs

        // Fetch the details of each story
        const storyPromises = topStoryIds.map(id => axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`));
        const stories = await Promise.all(storyPromises);

        // Filter the stories that were posted in the last 24 hours
        const recentStories = stories
            .map(story => story.data)
            .filter(story => story && story.time >= twentyFourHoursAgo);

        return recentStories;
    } catch (error) {
        console.error('Error fetching stories:', error.message);
        return [];
    }
}

// Function to format the stories for Discord message
function formatStoriesForDiscord(stories) {
    return stories.map(story => {
        return `**${story.title}**\n${story.url}\n`;
    }).join("\n");
}

// Event when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event when the bot detects a message
client.on('messageCreate', async (message) => {
    // Command to trigger the bot to fetch the latest Hacker News stories
    if (message.content === '!hackernews') {
        try {
            // Fetch the stories from the last 24 hours
            const recentStories = await getLast24HourStories();

            // If there are no recent stories, notify the user
            if (recentStories.length === 0) {
                message.channel.send("No stories from the last 24 hours.");
                return;
            }

            // Format and send the stories to Discord
            const formattedStories = formatStoriesForDiscord(recentStories);
            message.channel.send(formattedStories);

        } catch (error) {
            console.error('Error handling command:', error.message);
            message.channel.send("There was an error fetching the latest stories.");
        }
    }
});

// Log in to Discord using the bot's token from the .env file
client.login(process.env.DISCORD_TOKEN);


const PORT = 3000;
app.get('/', (_req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});