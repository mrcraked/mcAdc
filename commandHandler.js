const fs = require('fs');
const path = require('path');

const commands = new Map();

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

function handleCommand(bot, command, args) {
  const commandName = command.toLowerCase();
  if (commandName === 'help') {
    return listCommands();
  }
  if (commands.has(commandName)) {
    try {
      return commands.get(commandName).execute(bot, args,);
    } catch (error) {
      console.error(error);
      return `There was an error executing the ${commandName} command.`;
    }
  } else {
    return `Unknown command: ${command}`;
  }
}

function listCommands() {
  let helpText = 'Available commands:\n';
  commands.forEach(command => {
    helpText += `!${command.data.name}: ${command.data.description}\n  Usage: ${command.data.usage}\n\n`;
  });
  return helpText;
}

module.exports = { loadCommands, handleCommand };

