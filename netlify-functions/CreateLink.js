// netlify-functions/CreateLink.js

const { Base } = require('deta');

const deta = Base(process.env.DETA_PROJECT_KEY);
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

    // Generate temporary token
    const token = generateTemporaryToken();
    const expirationTime = Date.now() + parseInt(duration) * 1000;

    // Save link information to Deta.Base
    await linksTable.put({ token, address, expirationTime });

    return {
      statusCode: 200,
      body: JSON.stringify({ token, expirationTime }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

function generateTemporaryToken() {
  // Generate a unique temporary token (replace with your own logic)
  return Math.random().toString(36).substr(2);
}
