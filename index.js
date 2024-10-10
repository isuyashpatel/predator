const express = require('express');
const app = express();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Replace 'your-openai-api-key' and 'your-discord-bot-token' with your real API keys
const openaiApiKey = process.env.OPENAI_API_KEY;
const discordBotToken = process.env.DISCORD_BOT_TOKEN;

const hackerNewsAPI = 'https://hacker-news.firebaseio.com/v0/topstories.json';

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async (message) => {
    if (message.content === '!hackernews') {
        try {
            // Fetch top stories from Hacker News
            const topStories = await axios.get(hackerNewsAPI);
            const topStoryIds = topStories.data.slice(0, 10); // Fetch top 10 stories

            // Fetch the stories' details
            const storyPromises = topStoryIds.map(id => axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`));
            const stories = await Promise.all(storyPromises);

            const summaries = await summarizeStories(stories.map(story => story.data));

            message.channel.send(summaries);
        } catch (error) {
            console.error('Error fetching stories:', error);
            message.channel.send('There was an error fetching the latest stories.');
        }
    }
});

// Summarize using OpenAI's API
async function summarizeStories(stories) {
    const formattedStories = stories.map(story => `Title: ${story.title}\nLink: ${story.url}`).join("\n\n");

    const summaryResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: `Summarize these stories:\n\n${formattedStories}` }]
        },
        { headers: { Authorization: `Bearer ${openaiApiKey}` } }
    );

    return summaryResponse.data.choices[0].message.content;
}

client.login(discordBotToken);
const PORT = 3000;
app.get('/', (_req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});