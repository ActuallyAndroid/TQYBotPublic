require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
   name: 'hey',
   description: 'Replies with hey!'
  },

  {
    name: 'pullcharacter',
    description: 'Pulls a name for you.',
    options: [
      {
        name:'race1',
        description: 'Beatus, Sage, or Druger, or all.',
        type: ApplicationCommandOptionType.String,
        required: false,
      },

      {
        name:'race2',
        description: 'Beatus, Sage, or Druger, or all.',
        type: ApplicationCommandOptionType.String,
        required: false,
      },

      {
        name:'race3',
        description: 'Beatus, Sage, or Druger, or all.',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  {
    name: 'pullcard',
    description: 'Pulls the next card for you.',
  },

  {
    name: 'resetcards',
    description: 'Resets the cards after confirmation.',
  },

  {
    name: 'flipcoin',
    description: 'Flip a coin that will decide the outcome of the King card.',
  },

  {
    name: 'pullpair',
    description: 'Love is in the air <3.',
    options: [

      {
        name: 'sidepairs',
        description: 'Canon but not endgame.',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      },

      {
        name: 'crackpairs',
        description: 'Off the wall.',
        type: ApplicationCommandOptionType.Boolean,
        required: false
      },
    ],
  },

  // This is a conceptual example and may not directly work with your current setup
  {
    name: 'setuniverse',
    description: 'Sets the current universe for cards.',
    options: [
      {
        name: 'universe',
        description: 'The universe to switch to',
        type: ApplicationCommandOptionType.String, // This should correctly reference the enum
        required: true
      },
    ],
  },
  
  {
    name: 'addproject',
    description: 'Adds a new project to the game.',
    options: [
        {
            name: 'name',
            description: 'The name of the project.',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'description',
            description: 'A brief description of the project.',
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: 'length',
            description: 'The number of days required to complete the project.',
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
    ],
  },
];

const rest = new REST ({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID, 
        process.env.GUILD_ID
        ),
        { body: commands }
      );  

      console.log('Slash commands were registered successfuly!');
    } catch (error) {
      console.log(`There was an error: ${error}`);
  }
})();