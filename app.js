// Load Environment Variables
require("dotenv").config();
const express = require("express");
const { App, ExpressReceiver } = require("@slack/bolt");
const { WebClient } = require("@slack/web-api");
const schedule = require("node-schedule");
const { sendDailyMessageToUsers, sendBroadcastMessageToBotChannels, handleMessage, sendMessage, getUserByEmail, sendMessageToUser } = require("./functions");

const app = express();

// Parse JSON requests
app.use(express.json());

// Initialize Slack Bolt's ExpressReceiver
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const startApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
});

// Initialize the Slack Web API client
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);


//use to set event on slack channel
app.post("/slack/events", (req, res) => {
  // Extract the challenge parameter from the request body
  const { challenge } = req.body;
  // Respond to the challenge with the received challenge value
  res.send({ challenge });
});

// Listen to the app_mention event
startApp.event("app_mention", async ({ event, context }) => {
  try {
    console.log(
      "Received app_mention event from user",
      event.user,
      ":",
      event.text
    );
    // Handle the received app_mention event
    await handleMessage(event);
  } catch (error) {
    console.error("Error handling app_mention event:", error);
  }
});

// send message to any channel of ur choice
app.post("/slack/channels/one", async (req, res) => {
    try {
      const text = req.body.message;
      const channel = req.body.channel;
      const msg = await sendMessage(channel,text)

      res.status(200).json({
        message: "Message sent to channels.",
        data: msg
      });
  
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// API Route to trigger sending a message to bot's channels i.e bot most belong to the channel
app.post("/slack/channels/all", async (req, res) => {
  try {
    const messageText = req.body.message;
    const botChannels = await sendBroadcastMessageToBotChannels(messageText);

    res.status(200).json({
      message: "Message sent to bot channels.",
      channels: botChannels,
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to send messages to bot channels." });
  }
});

// Route for performing a search in Slack
app.post("/slack/search", async (req, res) => {
  try {
    const { query } = req.body; // Retrieve the search query from the request body

    const result = await slackClient.search.messages({
      query: query,
      sort: "timestamp",
      sort_dir: "desc",
      count: 10,
    });

    console.log("Search Results:", result.messages.matches);

    res.status(200).json(result.messages.matches);
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ error: error.message });
  }
});

//send message to all users in slack
app.post("/slack/users", async (req, res) => {
  try {
    const messageText = req.body.message;

    const users = await sendDailyMessageToUsers(messageText);

    res
      .status(200)
      .json({ message: "Message sent to user channels.", users: users });
  } catch (error) {
    res.status(500).json({ error: "Failed to send messages to users." });
  }
});

// get user by email and send message
app.post('/slack/users/:email', async (req, res) => {
    try {
      const email = req.params.email;
      const message = req.body.message;
      const user = await getUserByEmail(email);
  
      if (user) {
        // Send a message to the retrieved user
        await sendMessageToUser(user.id, message);
  
        res.status(200).json({ message: 'Message sent to the user.', user: user });
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    } catch (error) {
      console.error('Error getting user by email:', error);
      res.status(500).json({ error: 'Failed to get user by email.' });
    }
  });

// Schedule to send messages to users and channels every minute
schedule.scheduleJob("* * * * *", async () => {
  const userMessageText = "Send this message every minute to users";
  const channelMessageText = "Send this message every minute to channels";

  await sendDailyMessageToUsers(userMessageText);
  await sendBroadcastMessageToBotChannels(channelMessageText);
});

// Start your custom Express app
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Your Express app is running on port ${PORT}`);
});

// Start the Bolt app
(async () => {
  await startApp.start(process.env.PORT || 3000);
  console.log("Bolt app is running! yeeeeeeeeeeeeeeee");
})();
