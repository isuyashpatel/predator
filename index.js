const express = require('express');
const app = express();
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
console.log("suyash");

// Replace with your bot token
const token = process.env.DISCORD_BOT_TOKEN;

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Utility function to split messages into chunks if needed
function splitMessageIntoChunks(text, maxLength = 2000) {
  const chunks = [];
  while (text.length > maxLength) {
    const chunk = text.substring(0, maxLength);
    chunks.push(chunk);
    text = text.substring(maxLength);
  }
  if (text.length > 0) {
    chunks.push(text); // Add remaining text
  }
  return chunks;
}

// Fetch Hacker News top stories from the last 24 hours
async function getLast24HourStories() {
  try {
    const currentTime = Math.floor(Date.now() / 1000); // Get current UNIX timestamp
    const twentyFourHoursAgo = currentTime - 24 * 60 * 60; // Time 24 hours ago

    // Fetch top story IDs from Hacker News
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds = response.data.slice(0, 100); // Get top 100 story IDs

    // Fetch the story details
    const storyPromises = topStoryIds.map((id) =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    );
    const stories = await Promise.all(storyPromises);

    // Filter stories that were posted in the last 24 hours
    const recentStories = stories
      .map((story) => story.data)
      .filter((story) => story && story.time >= twentyFourHoursAgo);

    return recentStories;
  } catch (error) {
    console.error('Error fetching stories:', error.message);
    return [];
  }
}

// Format stories and create Discord-friendly embeds
function formatStoriesForDiscord(stories) {
  let formattedStories = stories
    .map((story) => {
      return `**${story.title}**\n${story.url}\n`;
    })
    .join("\n");

  // Split into chunks if necessary
  return splitMessageIntoChunks(formattedStories).map((chunk) => {
    const embed = new EmbedBuilder()
      .setTitle('Top Hacker News Stories (Last 24 Hours)')
      .setDescription(chunk)
      .setColor('#ff6600') // Optional: Change the embed color
      .setFooter({ text: 'Source: Hacker News' });
    return embed;
  });
}

// Handle the !hackernews command
client.on('messageCreate', async (message) => {
  if (message.content === '!hackernews') {
    try {
      // Fetch the stories from the last 24 hours
      const recentStories = await getLast24HourStories();

      // If there are no recent stories, notify the user
      if (recentStories.length === 0) {
        message.channel.send('No stories from the last 24 hours.');
        return;
      }

      // Format the stories and create the embeds
      const embeds = formatStoriesForDiscord(recentStories);

      // Send each embed as a separate message
      for (const embed of embeds) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error handling command:', error.message);
      message.channel.send('There was an error fetching the latest stories.');
    }
  }
});

// Log in to Discord with your bot's token
client.login(token);

const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});