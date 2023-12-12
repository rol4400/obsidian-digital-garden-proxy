// netlify-functions/CreateLink.js
const { Deta } = require('deta');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (event, context) => {
  try {
    const { address, duration } = JSON.parse(event.body);

    // Validate input
    if (!address || !duration || isNaN(parseInt(duration))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input' }),
      };
    }

    // Save link information to Deta.Base
    const link = await linksTable.put({ address, expirationTime: calculateExpirationTime(duration) });

    return {
      statusCode: 200,
      body: JSON.stringify({ link: "https://ryan-notes.netlify.app/?token=" + link.key, token: link.key, expirationTime: link.expires }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

function calculateExpirationTime(duration) {
  return Date.now() + parseInt(duration) * 1000;
}
