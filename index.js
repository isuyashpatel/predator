const express = require('express');
const app = express();
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Replace with your bot token
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const PRODUCT_HUNT_TOKEN = process.env.PRODUCT_HUNT_TOKEN;
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



// product hunt start
async function getTopProductHuntProducts() {
    try {
      const response = await axios.post(
        'https://api.producthunt.com/v2/api/graphql',
        {
          query: `
            query {
              posts(first: 50, order: RANKING) {
                edges {
                  node {
                    name
                    tagline
                    website
                    url
                  }
                }
              }
            }
          `
        },
        {
          headers: {
            'Authorization': `Bearer ${PRODUCT_HUNT_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
  
      return response.data.data.posts.edges.map(edge => edge.node);
    } catch (error) {
      console.error('Error fetching Product Hunt products:', error.response ? error.response.data : error.message);
      return [];
    }
  }
  
  // Format Product Hunt products and create Discord-friendly embeds
  function formatProductsForDiscord(products) {
    let formattedProducts = products
      .map((product, index) => {
        return `${index + 1}. **${product.name}**\n${product.tagline}\nWebsite: ${product.website}\nProduct Hunt: ${product.url}\n`;
      })
      .join("\n");
  
    return splitMessageIntoChunks(formattedProducts).map((chunk) => {
      const embed = new EmbedBuilder()
        .setTitle('Top 50 Product Hunt Products')
        .setDescription(chunk)
        .setColor('#da552f')
        .setFooter({ text: 'Source: Product Hunt' });
      return embed;
    });
  }
  
  // Handle commands
  client.on('messageCreate', async (message) => {
    if (message.content === '!hackernews') {
      try {
        const recentStories = await getLast24HourStories();
        if (recentStories.length === 0) {
          message.channel.send('No stories from the last 24 hours.');
          return;
        }
        const embeds = formatStoriesForDiscord(recentStories);
        for (const embed of embeds) {
          await message.channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error handling Hacker News command:', error.message);
        message.channel.send('There was an error fetching the latest Hacker News stories.');
      }
    } else if (message.content === '!producthunt') {
      try {
        const products = await getTopProductHuntProducts();
        if (products.length === 0) {
          message.channel.send('No products found on Product Hunt.');
          return;
        }
        const embeds = formatProductsForDiscord(products);
        for (const embed of embeds) {
          await message.channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error handling Product Hunt command:', error.message);
        message.channel.send('There was an error fetching the latest Product Hunt products.');
      }
    }
  });

//product hunt end



// write here example to write discord bot 

// Get current time in a formatted string
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZoneName: 'short'
    });
  }
  
  // Handle commands
  client.on('messageCreate', async (message) => {
    if (message.content === '!time') {
      const currentTime = getCurrentTime();
      const embed = new EmbedBuilder()
        .setTitle('Current Time')
        .setDescription(currentTime)
        .setColor('#0099ff')
        .setFooter({ text: 'Requested by: ' + message.author.username });
      message.channel.send({ embeds: [embed] });
    }
  });
  
// Log in to Discord with your bot's token
client.login(DISCORD_BOT_TOKEN);


//end of  example
const PORT = process.env.PORT || 3000;
app.get('/', (_req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
