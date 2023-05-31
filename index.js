const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
const token = process.env.TELEGRAM_TOKEN; // Replace with your Telegram bot token

// Connect to MongoDB
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    // Start the bot after successfully connecting to MongoDB
    startBot();
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error);
  });

// Define the user schema
const userSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
  },
});

// Create the User model
const User = mongoose.model("User", userSchema);

// Create a new Telegram bot
const bot = new TelegramBot(token, { polling: true });

// Start the bot and handle /start command
function startBot() {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log("Registering user:", chatId);

    // Check if the user is already registered
    User.findOne({ chatId })
      .then((user) => {
        if (user) {
          bot.sendMessage(chatId, "You are already registered for daily quotes!");
        } else {
          // Create a new user
          const newUser = new User({ chatId });
          const message = `
          You have been registered for daily quotes!
        
          Here are the available commands:
          /quote - Generate a random quote
          /help - Show the list of available commands and their functions
        
          Additional Features:
          - You will receive a daily quote automatically.
          - You will receive a "Good Morning" message at 6 AM every day.
          - You will receive a "Good Night" message at 10 PM every day.
        `;
        
          // Save the user to the database
          newUser
            .save()
            .then(() => {
              bot.sendMessage(chatId, message);
            })
            .catch((error) => {
              console.log("Error registering user:", error);
              bot.sendMessage(chatId, "An error occurred. Please try again later.");
            });
        }
      })
      .catch((error) => {
        console.log("Error checking user registration:", error);
        bot.sendMessage(chatId, "An error occurred. Please try again later.");
      });
  });

  // Other bot functionality...

  // Fetch quotes and send to users...
  // Fetch quotes from the API and send them to registered users
  function fetchQuotesAndSendToUsers() {
    fetch("https://type.fit/api/quotes")
      .then((response) => response.json())
      .then((data) => {
        // Get all registered users from the database
        User.find({})
          .then((users) => {
            users.forEach((user) => {
              // Randomly select a quote
              const randomIndex = Math.floor(Math.random() * data.length);
              const quote = data[randomIndex];

              // Send the quote to the user
              bot.sendMessage(user.chatId, `${quote.text}\n- ${quote.author}`);
            });
          })
          .catch((error) => {
            console.log("Error retrieving users:", error);
          });
      })
      .catch((error) => {
        console.log("Error fetching quotes:", error);
      });
  }

  // Schedule the fetching of quotes and sending to users
  setInterval(fetchQuotesAndSendToUsers, 24 * 60 * 60 * 1000);

  // Handle /quote command to generate a random quote
  bot.onText(/\/quote/, (msg) => {
    const chatId = msg.chat.id;

    fetch("https://type.fit/api/quotes")
      .then((response) => response.json())
      .then((data) => {
        const randomIndex = Math.floor(Math.random() * data.length);
        const quote = data[randomIndex];

        // Send the quote to the user
        bot.sendMessage(chatId, `${quote.text}\n- ${quote.author}`);
      })
      .catch((error) => {
        console.log("Error fetching quote:", error);
        bot.sendMessage(chatId, "An error occurred. Please try again later.");
      });
  });

  // Function to get the current Indian time in hours
  function getCurrentIndianTimeHours() {
    const currentTime = new Date();
    const utcOffset = currentTime.getTimezoneOffset();
    const currentIndianTime = new Date(
      currentTime.getTime() + (utcOffset + 330) * 60000
    ); // 330 minutes offset for Indian time
    return currentIndianTime.getHours();
  }

  // Schedule to send Good Morning and Good Night messages
  setInterval(() => {
    const currentHour = getCurrentIndianTimeHours();

    // Send Good Morning message at 6 AM
    if (currentHour === 6) {
      User.find({})
        .then((users) => {
          users.forEach((user) => {
            bot.sendMessage(user.chatId, "Good Morning! Have a great day!");
          });
        })
        .catch((error) => {
          console.log("Error retrieving users:", error);
        });
    }

    // Send Good Night message at 10 PM
    if (currentHour === 22) {
      User.find({})
        .then((users) => {
          users.forEach((user) => {
            bot.sendMessage(user.chatId, "Good Night! Have a restful sleep!");
          });
        })
        .catch((error) => {
          console.log("Error retrieving users:", error);
        });
    }
  }, 60 * 60 * 1000); // Check every hour

  // Start the bot
  bot.on("polling_error", (error) => {
    console.log("Polling error:", error);
  });
}
