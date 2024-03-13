import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Create a BedrockRuntimeClient with your configuration
const client = new BedrockRuntimeClient({ region: "us-east-1" });

const CONSOLE_CATEGORY_CLAUDE_CALL = 'claude-llm';
const prompt = `Hi! how are you?`;

// -------------------- BEGIN: PROMPT> SUPERHERO SIDEKICK ------------

const promptSuperHeroSidekick =
    `You are the great Stan Lee, the master story teller that created the Marvel Cinematic Universe. However, you are also an expert on all the heroes and villains in the DC Comics universe.
Your job is to create a unique interactive adventure for the player based on the @[Super Hero] the player has chosen to be the super hero. The player and the super hero will fight the evil @[Super Villain] who is the dastardly villain in your story. The player is the sidekick of the super hero whose job it is to assist @[Super Hero] during the mission you create, just like the way Robin was the sidekick to Batman.
The story you create should unfold slowly and the player and the superhero the player is helping should never defeat super villain too easily or too quickly.
Then, Tell the player what is going on the story you are creating and how things have changed given the last choice the player made, but be succinct and do it in two sentences or less. Add some dialogue to the paragraph to make things fun. 

Each dialogue line should always start with the identity of the character name that is speaking with the character's name in square brackets. For example if The Hulk says "Hulk smash" then you would write, \\[The Hulk\\] "Hulk smash!" Immediately after the character's identity comes the double-quoted line they are saying.

If the player says anything put the word "player" in square brackets inside the double-quoted text. Note, there is no need to use sequence words or ordinal indicators before the story text, and please omit framing sentences such as "Your story continues" or "Here is the continuation of the story" before the narrative text. Get to the point.
Offer the player exactly two distinct choices. The choices be short. The first choice should have the string "CHOICE:" in front of it. The second choice should have the string "CHOICE:" in front of it.

After the choices you print the choice summary. The first choice summary have the string "SUMMARY:" in front of it followed by a 2 word summary of the first choice in the form of a command. The second choice summary should have the string "SUMMARY:" in front of it followed by a 2 word summary of the second choice in the form of a command.

If the player's response to the previous set of choices you offered them is obviously not one of the choices you offered, then politely ask them to choose one of the choices you gave them. Do not allow them to make a choice you did not offer.

When you have ended the story, make sure you put the phrase "the end" at the end of the text in double-quotes.

@[Recent Story Progress]`

// -------------------- END  : PROMPT> SUPERHERO SIDEKICK ------------

// -------------------- BEGIN: PROMPT> FOLLOW-UP TO STORY PROGRESS ------------


// -------------------- END  : PROMPT> FOLLOW-UP TO STORY PROGRESS ------------

// -------------------- BEGIN: SUBSTITUTION VARIABLES CODE ------------

/**
 * Replaces all occurrences of a variable name in the target text with the
 * specified replacement value.
 *
 * @param {string} targetText The text containing variables to replace.
 * @param {string} variableName The name of the variable to replace in the text.
 * @param {string} replacementValue The value to replace the variable with.
 *
 * @returns {string} The new string with variables replaced.
 *
 * @throws {Error} If any of the input parameters are invalid.
 */
function substituteStoryVariable(targetText, variableName, replacementValue) {
  const errPrefix = "(substituteStoryVariable) ";

  // Input validation
  if (typeof targetText !== 'string') {
    throw new Error(`${errPrefix}targetText must be a string.`);
  }
  if (typeof variableName !== 'string') {
    throw new Error(`${errPrefix}variableName must be a string.`);
  }
  if (typeof replacementValue !== 'string') {
    throw new Error(`${errPrefix}replacementValue must be a string.`);
  }

  // Constructing regex pattern dynamically
  const pattern = new RegExp(`@\\[${variableName}\\]`, 'gi');
  return targetText.replace(pattern, replacementValue);
}

/**
 * Iterates over an array of substitution objects, replacing each occurrence of
 * the specified variable names in the target text with their corresponding
 * replacement values.
 *
 * @param {Array<{name: string, replace: string}>} arySubstitutionObjs Array of
 *        objects, each containing a `name` field for the variable name to
 *        replace and a `replace` field for the replacement value.
 * @param {string} targetText The text containing variables to be replaced.
 *
 * @returns {string} The new string with all specified variables replaced.
 *
 * @throws {Error} If any of the input parameters are invalid.
 */
function substituteStoryVariableArray(arySubstitutionObjs, targetText) {
  const errPrefix = "(substituteStoryVariableArray) ";

  // Input validation
  if (!Array.isArray(arySubstitutionObjs) || !arySubstitutionObjs.every(obj => typeof obj === 'object' && typeof obj.name === 'string' && typeof obj.replace === 'string')) {
    throw new Error(`${errPrefix}arySubstitutionObjs must be an array of objects with 'name' and 'replace' fields as strings.`);
  }
  if (typeof targetText !== 'string' || targetText.trim().length < 1) {
    throw new Error(`${errPrefix}targetText must be a non-empty string.`);
  }

  // Iterating over substitution objects and substituting variables
  return arySubstitutionObjs.reduce((currentText, substitutionObj) => {
    return substituteStoryVariable(currentText, substitutionObj.name, substitutionObj.replace);
  }, targetText);
}

// -------------------- END  : SUBSTITUTION VARIABLES CODE ------------

function buildFullPrompt(
    superHeroName,
    superVillainName,
    storyProgressText,
    playersChoice) {
  const errPrefix = `(buildFullPrompt) `;

  if (typeof superHeroName !== 'string' || superHeroName.trim().length < 1) {
    throw new Error(`${errPrefix}superHeroName must be a non-empty string.`);
  }

  if (typeof superVillainName !== 'string' || superVillainName.trim().length < 1) {
    throw new Error(`${errPrefix}superVillainName must be a non-empty string.`);
  }

  // Validate parameters.
  if (playersChoice !== null) {
    if (typeof playersChoice !== 'string' || playersChoice.trim().length < 1) {
      throw new Error(`${errPrefix}playersChoice must be a non-empty string.`);
    }

    // If we have a player's choice, then we must have a
    //  story progress update.
    if (typeof storyProgressText !== 'string' || storyProgressText.trim().length < 1) {
      throw new Error(`${errPrefix}storyProgressText must be a non-empty string because the playersChoice input parameter is not NULL.`);
    }
  }

  const arySubstitutionVariables = [];

  arySubstitutionVariables.push(
      { name: 'Super Hero', replace: superHeroName }
  );
  arySubstitutionVariables.push(
      { name: 'Super Villain', replace: superVillainName }
  );

  let playersChoiceAddendum = '';

  if (playersChoice) {
    playersChoiceAddendum =
         `
Here is what just happened in the story.  

${storyProgressText}

You should continue the story from here by incorporating the player's recent choice to @[Player Choice].
`
    playersChoiceAddendum =
        substituteStoryVariable(playersChoiceAddendum, )
  }

  arySubstitutionVariables.push(
      { name: 'Recent Story Progress', replace: playersChoiceAddendum}
  );

  // Make the necessary substitutions to the template prompt
  //
  const promptWithSubstitutions =
      substituteStoryVariableArray(
          arySubstitutionVariables,
          promptSuperHeroSidekick);

  const fullPrompt =
      promptWithSubstitutions

  return fullPrompt;
}

// Follow-up prompt text.
const promptFollowUp =
    buildFullPrompt(
        'Black Widow',
        'Harley Quinn',
        'Sneak into the carnival to find Harley and then create a new set of choices for the player'
    )

const input = {
    // You can change the modelId
    // "anthropic.claude-v1"
    // "anthropic.claude-instant-v1"
    // "anthropic.claude-v2"
    // "anthropic.claude-v2:1"
    modelId: "anthropic.claude-instant-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
    prompt: `\n\nHuman:${promptFollowUp}\n\nAssistant:`,
    max_tokens_to_sample: 300,
    temperature: 0.5,
    top_k: 250,
    top_p: 1,
  }),
};

// -------------------- BEGIN: MAKE LLM CALL ------------

console.info(CONSOLE_CATEGORY_CLAUDE_CALL, `Calling LLM with prompt:\n\n${promptWithSubstitutions}`);

const startedAt = new Date();

// Create an InvokeModelCommand with the input parameters
const command = new InvokeModelCommand(input);

// Send the command to invoke the model and await the response
const response = await client.send(command);

const secondsElasped = (new Date() - startedAt) / 1000;

console.log("-------------------");
console.log(`---Full Response in ${secondsElasped} seconds ---`);
console.log("-------------------");
console.log(response);

// response.body = Uint8ArrayBlobAdapter(65) [Uint8Array] [
//   123,  34,  99, 111, 109, 112, 108, 101, 116, 105, 111,
//   110,  34,  58,  34,  32,  73,  39, 109,  32, 119, 101,
//   108, 108,  44,  32, 116, 104,  97, 110, 107, 115,  33,
//    34,  44,  34, 115, 116, 111, 112,  95, 114, 101,  97,
//   115, 111, 110,  34,  58,  34, 115, 116, 111, 112,  95,
//   115, 101, 113, 117, 101, 110,  99, 101,  34, 125
// ]

// Save the raw response
const rawRes = response.body;

// Convert it to a JSON String
const jsonString = new TextDecoder().decode(rawRes);

// Parse the JSON string
const parsedResponse = JSON.parse(jsonString);

console.log("-------------------------");
console.log("---Parsed Response Body---");
console.log("-------------------------");
// Answers are in parsedResponse.completion
console.log(parsedResponse);
console.log("-------------------------");

// -------------------- END  : MAKE LLM CALL ------------


// Output:
// {
//   completion: " I'm doing well, thanks for asking!",
//   stop_reason: 'stop_sequence'
// }
