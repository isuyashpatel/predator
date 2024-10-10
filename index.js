const express = require('express');
const app = express();
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const hackerNewsAPI = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const openAIAPI = 'https://api.openai.com/v1/chat/completions';

// Function to get top stories from the last 24 hours
async function getLast24HourStories() {
    try {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in UNIX seconds
        const twentyFourHoursAgo = currentTime - 24 * 60 * 60; // 24 hours ago

        // Fetch top stories from Hacker News
        const topStories = await axios.get(hackerNewsAPI);
        const topStoryIds = topStories.data.slice(0, 100); // Get top 100 stories to filter

        // Fetch details of each story
        const storyPromises = topStoryIds.map(id => axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`));
        const stories = await Promise.all(storyPromises);

        // Filter stories that were posted within the last 24 hours
        const recentStories = stories
            .map(story => story.data)
            .filter(story => story && story.time >= twentyFourHoursAgo);

        return recentStories;
    } catch (error) {
        console.error('Error fetching stories:', error.message);
        return [];
    }
}

// Function to summarize the stories using OpenAI API
async function summarizeStories(stories) {
    const formattedStories = stories.map(story => `Title: ${story.title}\nLink: ${story.url}`).join("\n\n");

    try {
        const response = await axios.post(
            openAIAPI,
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: `Summarize these stories:\n\n${formattedStories}` }],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error with OpenAI API:', error.response ? error.response.data : error.message);
        return "Couldn't summarize the stories.";
    }
}

// Discord bot event listener for messages
client.on('messageCreate', async (message) => {
    if (message.content === '!hackernews') {
        try {
            // Fetch stories from the last 24 hours
            const recentStories = await getLast24HourStories();

            if (recentStories.length === 0) {
                message.channel.send("No stories from the last 24 hours.");
                return;
            }

            // Summarize the stories using OpenAI API
            const summary = await summarizeStories(recentStories);
            message.channel.send(summary);
        } catch (error) {
            console.error('Error handling command:', error.message);
            message.channel.send("There was an error fetching the latest stories.");
        }
    }
});

// Log in to Discord with your token
client.login(process.env.DISCORD_TOKEN);

const PORT = 3000;
app.get('/', (_req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});