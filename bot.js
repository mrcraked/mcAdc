const mineflayer = require("mineflayer");
const mineflayerViewer = require("prismarine-viewer").mineflayer;
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const path = require("path");
const configx = require("./config.json")

let bot = null;
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.File({
      filename: path.join(__dirname, configx.logging.directory, "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(__dirname, configx.logging.directory, "combined.log"),
      maxsize: configx.logging.maxSize,
      maxFiles: configx.logging.maxFiles,
    }),
  ],
});

const GeneratedPass = require("./GeneratedPass.json");


function createBot(config) {
  bot = mineflayer.createBot({
    host: config.minecraftServer.host,
    port: config.minecraftServer.port,
    username: config.bot.username,
    version: config.bot.version,
  });
  
  const { pathfinder } = require("mineflayer-pathfinder");
  const tool = require("mineflayer-tool").plugin;
  const collectBlock = require("mineflayer-collectblock").plugin;
  const pvp = require("mineflayer-pvp").plugin;
  //ticks


  bot.on("mount", () => {
    bot.dismount();
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(tool);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(pvp);
  

  bot.on("spawn", async () => {
    logger.info("Bot has spawned");
  
    if (config.Auto_auth.enabled) {
      const host = config.minecraftServer.host;
      let password = null;
  
      // Check if GeneratedPass is properly initialized
      if (!GeneratedPass.passwords) {
        GeneratedPass.passwords = [];
      }
  
      // Check if a password already exists for this host
      const existingHostConfig = GeneratedPass.passwords.find(
        (entry) => entry.host === host
      );
  
      if (existingHostConfig && existingHostConfig.password) {
        password = existingHostConfig.password;
      } else {
        // Generate a new password
        password = passGenerator(12);
  
        // Add or update the entry for this host
        const hostIndex = GeneratedPass.passwords.findIndex(
          (entry) => entry.host === host
        );
  
        if (hostIndex !== -1) {
          GeneratedPass.passwords[hostIndex] = { host, password };
        } else {
          GeneratedPass.passwords.push({ host, password });
        }
  
        // Send the password to the local server
        try {
          const response = await fetch("http://localhost:3000/generatedpass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host, password }),
          });
  
          if (!response.ok) {
            logger.error(`Failed to send password: ${response.statusText}`);
          } else {
            logger.info("Password sent successfully to the server.");
          }
        } catch (error) {
          logger.error(`Error while sending password: ${error}`);
        }
      }
  
      // Perform authentication
      setTimeout(() => {
        bot.chat(`/register ${password} ${password}`);
        bot.chat(`/login ${password}`);
      }, 500);
  
      logger.info("Authentication commands executed.");
    }
  });

  bot.on("chat", (username, message) => {
    logger.info(`Chat: ${username}: ${message}`);
  });

  bot.on("error", (error) => {
    logger.error(`Bot error: ${error.message}`);
  });

  bot.on("kicked", (reason) => {
    logger.warn(`Bot was kicked: ${reason}`);
  });

  bot.once("spawn", () => {
    const mcData = require("minecraft-data")(bot.version);
    mcData.itemsByName["leather_cap"] = mcData.itemsByName["leather_helmet"];
    mcData.itemsByName["leather_tunic"] =
      mcData.itemsByName["leather_chestplate"];
    mcData.itemsByName["leather_pants"] =
      mcData.itemsByName["leather_leggings"];
    mcData.itemsByName["leather_boots"] = mcData.itemsByName["leather_boots"];
    mcData.itemsByName["lapis_lazuli_ore"] = mcData.itemsByName["lapis_ore"];
    mcData.blocksByName["lapis_lazuli_ore"] = mcData.blocksByName["lapis_ore"];
    const {
      Movements,
      goals: {
        Goal,
        GoalBlock,
        GoalNear,
        GoalXZ,
        GoalNearXZ,
        GoalY,
        GoalGetToBlock,
        GoalLookAtBlock,
        GoalBreakBlock,
        GoalCompositeAny,
        GoalCompositeAll,
        GoalInvert,
        GoalFollow,
        GoalPlaceBlock,
      },
      pathfinder,
      Move,
      ComputedPath,
      PartiallyComputedPath,
      XZCoordinates,
      XYZCoordinates,
      SafeBlock,
      GoalPlaceBlockOptions,
    } = require("mineflayer-pathfinder");

    // Set up pathfinder
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    mineflayerViewer(bot, { port: 3007, firstPerson: true });
    
  });

  return bot;
}

function getBot() {
  return bot;
}

function stopBot() {
  if (bot) {
    if (bot.viewer) {
      bot.viewer.close();
    }
    bot.end();
    bot = null;
    logger.info("Bot stopped");
  }
}

function passGenerator(length = 8) {
  // Character sets for password generation
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // Combine all character sets
  const allChars = lowercase + uppercase + numbers + symbols;

  // Ensure at least one character from each set
  let password = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  // Fill the rest of the password with random characters
  for (let i = 4; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the password to randomize the placement of required characters
  return password.sort(() => Math.random() - 0.5).join("");
}

module.exports = { createBot, getBot, stopBot, logger };
