// Loading Files
require('dotenv').config();
const fs = require('fs').promises; // Use the Promise-based API for async operations
const { Client, IntentsBitField } = require('discord.js');
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds, 
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

const path = require('path');
const stateFilePath = path.join(__dirname, 'cards', 'state.json'); // Path to your state file
// Example list of valid universes. This could be dynamic based on your application's needs.
const validUniverses = ['MOTW', 'HG', 'GREEK'];

/**
 * Checks if the provided universe name is valid.
 * @param {string} universeName The universe name to check.
 * @returns {boolean} True if the universe name is valid, false otherwise.
 */
function checkUniverseValidity(universeName) {
    return validUniverses.includes(universeName);
}

///////////////////////////////////////////// Read and Writing
// Load the state when the bot starts
let gameState;
client.on('ready', async () => {
    gameState = await loadOrInitializeState();
    console.log(`✅ ${client.user.tag} is online and the game state is loaded.`);
});

///////////////////////////////////////////// List of names
// List of Sage names
const SageNames = [
    "Wren",
    "Ashe",
    "Zach",
    "Noah",
    "Frey",
    "Gwen",
    "Fawn",
    "Wisp",
    "Cedric",
    "Alistair",
    "Maddie",
    "Mio",
];
  
// List of Druger names
  const DrugerNames = [
    "Massacre",
    "Nix",
    "Claw",
    "Bloodbath",
    "Havoc",
    "Fury",
    "Roy",
];
  
// List of Beatus names
  const BeatusNames = [ 
    "Yu",
    "Lee",
    "Ace",
    "Castor",
    "Pollux",
    "Ravi",
    "Delphi",
];

// Combine the names into a single list
const fullNameList = [...BeatusNames, ...DrugerNames, ...SageNames];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// Functions
// Function to get the current universe directly from state.json
async function getCurrentUniverse() {
    try {
        const stateData = await fs.readFile(stateFilePath, 'utf8');
        const state = JSON.parse(stateData);
        return state.currentUniverse || 'MOTW'; // Default to 'MOTW' if not found
    } catch (error) {
        console.error('Error reading the current universe:', error);
        return 'MOTW'; // Default to 'MOTW' if an error occurs
    }
}

//////////////////////////////// Utility function to enforce a timeout on a promise
function timeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Operation timed out"));
        }, ms);

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}


// Wrapper function for pullcard with retry logic
async function pullCardWithRetry(maxRetries, timeoutMs) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            console.log(`Attempt ${attempts + 1} to pull a card...`);
            // Call pullcard function with a timeout
            const result = await timeout(pullcard(), timeoutMs);
            console.log("Card pulled successfully within timeout.");
            return result; // Successfully pulled a card
        } catch (error) {
            console.error(`Attempt ${attempts + 1} failed:`, error.message);
            if (error.message === "Operation timed out") {
                attempts++;
                if (attempts >= maxRetries) {
                    console.error("Maximum retries reached. Giving up.");
                    return "Error: Unable to pull a card after multiple attempts.";
                }
                console.log("Retrying...");
            } else {
                // If error is not due to timeout, rethrow or handle differently
                throw error;
            }
        }
    }
}

////////////////////////////////////////////////// Adjusted Function to pull a card and update the game state with added logging
////////////////////////////////////////////////// PULL CARD
////////////////////////////////////////////////// PULL CARD
////////////////////////////////////////////////// PULL CARD
////////////////////////////////////////////////// PULL CARD
async function pullcard() {
    console.log("Starting to pull a card...");

    try {
        console.log("Loading or initializing game state...");
        gameState = await loadOrInitializeState(); // Reload gameState to reflect any changes
        console.log("Game state loaded successfully.");
    } catch (error) {
        console.error("Failed to load or initialize game state:", error);
        return "Error: Unable to load game state.";
    }

    // Advance the day
    gameState.currentDay += 1;
    let projectUpdates = [];
    gameState.projects.forEach(project => {
        if (project.remaining > 0) {
            project.remaining -= 1;
            // Check if the project is completed
            if (project.remaining === 0) {
                console.log(`Project "${project.name}" completed.`);
                projectUpdates.push(`Project "${project.name}" completed.`);
            } else {
                // Optionally add updates for projects that are not yet completed
                projectUpdates.push(`Project "${project.name}" has ${project.remaining} round(s) remaining.`);
            }
        }
    });

    console.log("Filtering unpulled cards...");
    const unpulledCards = Object.keys(gameState.cards).filter(key => !gameState.cards[key].pulled);

    if (unpulledCards.length === 0) {
        console.log("All cards have been pulled. No more cards to pull.");
        return 'All cards have been pulled.';
    }

    const randomIndex = Math.floor(Math.random() * unpulledCards.length);
    const selectedCardKey = unpulledCards[randomIndex];
    gameState.cards[selectedCardKey].pulled = true;
    console.log(`Selected card key: ${selectedCardKey} and marked as pulled.`);

    // Constructing the response message with the card description and any project updates
    let responseMessage = `Round ${gameState.currentDay}: ${gameState.cards[selectedCardKey].description}`;
    if (projectUpdates.length > 0) {
        responseMessage += `\n\nProject Updates:\n${projectUpdates.join('\n')}`;
    }

    try {
        console.log("Writing updated game state to file...");
        await fs.writeFile(stateFilePath, JSON.stringify(gameState, null, 2), 'utf8');
        console.log("Game state file updated successfully.");
    } catch (error) {
        console.error("Error writing state file:", error);
        return "Error: Unable to update game state file.";
    }

    // Optionally remove completed projects from the active list
    gameState.projects = gameState.projects.filter(project => project.remaining > 0);

    // Return the constructed response message with card details and project updates
    return responseMessage;
}

//////////////////////////////////////////////////////// Function to load or initialize the game state, with optional reset
async function loadOrInitializeState(reset = false) {
    let state;
    try {
        // Check if the state file exists and read it
        const stateExists = await fs.access(stateFilePath).then(() => true).catch(() => false);
        
        if (stateExists) {
            const stateData = await fs.readFile(stateFilePath, 'utf8');
            state = JSON.parse(stateData);
        } else {
            // Initialize state if file does not exist
            state = { currentUniverse: 'MOTW', cards: {} }; // Example initial structure
        }

        let needsWrite = !stateExists; // Flag to determine if we need to write back to the file

        // Determine the cards file based on the current universe or default to MOTW if not found
        const currentUniverse = state.currentUniverse || 'MOTW';
        const cardsFilePath = path.join(__dirname, 'cards', `${currentUniverse}cards.txt`);

        if (reset) {
            // Load cards for the current universe to reset
            const cardsData = await fs.readFile(cardsFilePath, 'utf8');
            const cards = cardsData.split('\n').map(line => line.trim()).filter(line => line);
            const newCardsState = cards.map((description, index) => ({ description, pulled: false }));
            
            // Only update if there's an actual change in the cards data
            if (JSON.stringify(state.cards) !== JSON.stringify(newCardsState)) {
                state.cards = newCardsState;
                needsWrite = true;
            }
        }

        // Save the potentially updated state back to the file only if necessary
        if (needsWrite) {
            await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
        }
    } catch (error) {
        console.error('Error loading or initializing state:', error);
    }
    return state;
}

////////////////////////////////////////////////// Function to change the universe and update cards accordingly
async function setUniverse(newUniverse) {
    try {
        // Step 1: Read the current state
        let stateData = await fs.readFile(stateFilePath, 'utf8');
        let state = JSON.parse(stateData);

        // Step 2: Update the currentUniverse
        state.currentUniverse = newUniverse;

        // Step 3 & 4: Load the new universe's card file and update the cards
        const newCardsFilePath = path.join(__dirname, 'cards', `${newUniverse}cards.txt`);
        const newCardsData = await fs.readFile(newCardsFilePath, 'utf8');
        const newCardsLines = newCardsData.split('\n').map(line => line.trim()).filter(line => line);
        
        // Assuming the new card file structure is similar to the state's cards structure
        let newCards = {};
        newCardsLines.forEach((description, index) => {
            newCards[index] = { description, pulled: false };
        });

        state.cards = newCards;

        // Step 5: Write the updated state back to the state.json file
        await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
        console.log(`Universe changed to ${newUniverse}. Cards reset.`);
    } catch (error) {
        console.error('Error changing the universe:', error);
    }
}

///////////////////////////////////////////////// Commands!!!
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    /// hey to debug
    if (interaction.commandName === 'hey') {
        await interaction.reply('hey!');
    }

    // pulling character
    if (interaction.commandName === 'pullcharacter') {
        const raceOptions = ['race1', 'race2', 'race3'].map(option => interaction.options.getString(option));
        let replies = [];

        const pickNameFromRace = (race) => {
            switch (race?.toLowerCase()) {
                case 'druger':
                    return `**${DrugerNames[Math.floor(Math.random() * DrugerNames.length)]}**`;
                case 'beatus':
                    return `**${BeatusNames[Math.floor(Math.random() * BeatusNames.length)]}**`;
                case 'sage':
                    return `**${SageNames[Math.floor(Math.random() * SageNames.length)]}**`;
                case 'all':
                    return `**${fullNameList[Math.floor(Math.random() * fullNameList.length)]}**`;
                default:
                    return null;
            }
        };

        raceOptions.forEach(race => {
            if (race) {
                replies.push(pickNameFromRace(race));
            }
        });

        // Ensure at least one name is pulled if no valid races were specified
        if (replies.length === 0) {
            replies.push(pickNameFromRace('all'));
        }

        // Reply with the picked names, change separator based on the number of names
        const replyText = replies.length > 3 ? replies.filter(name => name).join(', ') : replies.filter(name => name).join(' and ');
        await interaction.reply(`You have pulled: ${replyText}`);
    }

    /// pulling card
    if (interaction.commandName === 'pullcard') {
        await interaction.deferReply(); // Acknowledge the interaction immediately
        const cardDescription = await pullCardWithRetry(3, 10000);
        await interaction.editReply(cardDescription); // Follow up with the actual response
    }

    // resetting
    if (interaction.commandName === 'resetcards') {
        // Ask for confirmation
        const filter = m => m.author.id === interaction.user.id;
        await interaction.reply('Are you sure you want to reset the cards? Type "yes" to confirm.');
    
        const collector = interaction.channel.createMessageCollector({ filter, time: 15000 }); // 15 seconds to reply
    
        collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'yes') {
                // Trigger the reset
                gameState = await loadOrInitializeState(true); // Pass true to reset the game state
                await interaction.followUp('The cards have been reset.');
                collector.stop();
            }
        });
    
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp('No confirmation received, card reset cancelled.');
            }
        });
    }
    
    if (interaction.commandName === 'setuniverse') {
        await interaction.deferReply();
        const newUniverse = interaction.options.getString('universe');
    
        // Validate the universe
        if (!checkUniverseValidity(newUniverse)) {
            await interaction.editReply({ content: 'Invalid universe name provided.', ephemeral: true });
            return;
        }
    
        try {
            // Change the universe (ensure this function awaits all async operations)
            await setUniverse(newUniverse);
            await interaction.editReply(`Universe changed to ${newUniverse}. Cards reset.`);
        } catch (error) {
            console.error('Error changing the universe:', error);
            await interaction.editReply('Failed to change the universe due to an error.');
        }
    }

    if (interaction.commandName === 'flipcoin') {
        // Flip a coin logic
        const result = Math.random() < 0.5 ? '1: you remember everything and the dreamhouse changes.' : '2: you remember something that happened in another time and place, what is it?';
        await interaction.reply(`The coin landed on **${result}**`);
    }

    /// SHIPPING PAIRS //////////////////////////////////////////////////////////////////////////////////////////////////////
    const basePairs = [
        'Ace + Wren',
        'Massacre + Wren',
        'Claw + Ashe',
        'Bloodbath + Noah',
        'Gwen + Roy',
        'Fawn + Lee',
        'Cedric + Havoc',
        'Nix + Castor',
        'Nix + Wren',
        'Yu + Alistair',
        'Frey + Ravi',
        'Wisp + Fury',
        'Zach + Jasper',
        'Ravi + Delphi',
    ];

    const sidePairs = [
        'Ace + Maddie',
        'Massacre + Ashe',
        'Nix + Lee',
        'Zach + Lee',
        'Zach + Maddie',
        'Zach + Castor',
        'Yu + Ace',
        'Lee + Maddie',
        'Castor + Maddie',
    ];
    
    const crackshipPairs = [
        'Massacre + Yu',
        'Bloodbath + Gwen',
        'Bloodbath + Ravi',
        'Yu + Pollux',
        'Wisp + Castor',
        'Wisp + Nix',
        'Cedric + Fury',
        'Yu + Nix',
        'Wren + Ravi',
        'Massacre + Castor',
        'Cedric + Delphi',
        'Gwen + Ravi',
        'Ace + Fury',
        'Fury + Lee',
    ];

    // Assuming interaction is already defined in your event handler
    if (interaction.commandName === 'pullpair') {
        await interaction.deferReply();
        const includeSidepairs = interaction.options.getBoolean('sidepairs'); // Correct option name
        const includeCrackpairs = interaction.options.getBoolean('crackpairs'); // Correct option name
        let pool = [...basePairs]; // Start with the base pair list

        // If sideline is true, include them in the pool
        if (includeSidepairs) {
            pool = pool.concat(sidePairs);
        }

        // If crackships is true, include them in the pool
        if (includeCrackpairs) {
            pool = pool.concat(crackshipPairs);
        }

        // Ensure the pool has enough items to select from
        if (pool.length === 0) {
            await interaction.editReply('No pairs available to select.');
            return;
        }

        // Randomly select one item from the pool
        const randomIndex = Math.floor(Math.random() * pool.length);
        const selectedPair = pool[randomIndex];

        // Respond with the selected pair
        await interaction.editReply(`Selected pair: ${selectedPair}`);
    }

    if (interaction.commandName === 'addproject') {
        await interaction.deferReply();
        const projectName = interaction.options.getString('name');
        const projectDescription = interaction.options.getString('description');
        const projectLength = interaction.options.getInteger('length');

        try {
            // Assuming loadOrInitializeState loads your game state and returns it
            let gameState = await loadOrInitializeState();
            
            // Add the new project
            gameState.projects.push({
                name: projectName,
                description: projectDescription,
                length: projectLength,
                remaining: projectLength // Initialize remaining time with the total project length
            });

            // Assuming saveGameState saves your updated game state
            await fs.writeFile(stateFilePath, JSON.stringify(gameState, null, 2), 'utf8');

            // After successfully adding the project and saving the game state, edit the reply
            await interaction.editReply(`Project "${projectName}" added successfully.`);
        } 
        
        catch (error) {
            console.error("Failed to add project:", error);
            await interaction.editReply("Error: Unable to add the project.");
        }
    }
});

client.login(process.env.TOKEN);