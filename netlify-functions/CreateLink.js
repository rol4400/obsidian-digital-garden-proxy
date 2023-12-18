// netlify-functions/CreateLink.js
const { Deta } = require('deta');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

let HEADERS = {
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '8640',
  'Access-Control-Allow-Origin': '*',
}

exports.handler = async (req, context) => {
  try {

    if (req.httpMethod !== 'POST') {
      // To enable CORS
      return {
        statusCode: 200, // <-- Important!
        HEADERS,
        body: 'This was not a POST request!'
      };
   }

    const { address, duration, telegramIds } = JSON.parse(req.body);

    // Validate input
    if (!address || !duration || isNaN(parseInt(duration))) {
      return {
        statusCode: 400,
        HEADERS,
        body: JSON.stringify({ error: 'Invalid input' }),
      };
    }

    // Save link information to Deta.Base
    const link = await linksTable.put({ address, expirationTime: calculateExpirationTime(duration), telegramIds });

    return {
      statusCode: 200,
      HEADERS,
      body: JSON.stringify({ link: "https://ryan-notes.netlify.app/?token=" + link.key, token: link.key, expirationTime: link.expires }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

function calculateExpirationTime(duration) {
  return Date.now() + parseInt(duration) * 1000;
}
