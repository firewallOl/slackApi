// Load Environment Variables
require("dotenv").config();
const { WebClient } = require("@slack/web-api");



// Initialize the Slack Web API client
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);


// Function to send a message to channels where the bot is a member
async function sendBroadcastMessageToBotChannels(messageText) {
    try {
      const result = await slackClient.conversations.list({
        types: "public_channel,private_channel", // Specify the channel types
        limit: 1000, // Adjust as per your needs, maximum is 1000
      });
  
      const botChannels = result.channels.filter((channel) => channel.is_member); // Filter channels where the bot is a member
  
      for (const channel of botChannels) {
        await sendMessage(channel.id, messageText);
      }
  
      return botChannels;
    } catch (error) {
      console.error("Error sending message to bot channels:", error);
      throw error;
    }
  }


  // Function to send a message to all users
async function sendDailyMessageToUsers(messageText) {
    try {
      const result = await slackClient.users.list();
      console.log(result);
      const users = result.members;
  
      for (const user of users) {
        await sendMessageToUser(user.id, messageText);
      }
  
      return users; // Return the list of users after sending messages
    } catch (error) {
      console.error("Error sending the scheduled message to users:", error);
      throw error;
    }
  }


  // Function to send a message to a user
async function sendMessageToUser(userId, text) {
    try {
      const result = await slackClient.chat.postMessage({
        channel: userId,
        text: text,
      });
      console.log("Message sent to user:", userId, result.ts);
    } catch (error) {
      console.error("Error sending message to user:", userId, error);
    }
  }


  //send simple message
  // Function to send a message to a channel
async function sendMessage(channel, text) {
    try {
      const result = await slackClient.chat.postMessage({
        channel: channel,
        text: text,
      });
      console.log("Message sent:", result.ts); // Logs the timestamp of the sent message
      return result;
    } catch (error) {
      console.error("Error posting message:", error);
    }
  }

  async function sendBroadcastMessage(channels, messageText) {
    for (const channel of channels) {
      try {
        await sendMessage(channel.id, messageText);
      } catch (error) {
        console.error(`Error sending message to channel ${channel.name}:`, error);
        // Log the failed channel or handle the error as needed
      }
    }
  }

  // Function to handle received app_mention messages
async function handleMessage(event) {
    const message = event.text;
    const channel = event.channel;
  
    // Send a response back to the user
    await sendMessage(channel, `You mentioned me with: ${message}`);
  }
  
  // Function to get a user by email
async function getUserByEmail(email) {
    try {
      const result = await slackClient.users.lookupByEmail({
        email: email,
      });
  
      if (result && result.ok) {
        const user = result.user;
        return user;
      } else {
        console.error('Error getting user by email:', result.error);
        throw new Error('Failed to get user by email.');
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }
  

  module.exports = {sendMessage, sendDailyMessageToUsers, sendBroadcastMessageToBotChannels, sendMessageToUser,sendBroadcastMessage, handleMessage, getUserByEmail}