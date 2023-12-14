// netlify-functions/CreateLink.js
const { Deta } = require('deta');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

let HEADERS = {
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '8640'
}

//This solves the "No ‘Access-Control-Allow-Origin’ header is present on the requested resource."

HEADERS['Access-Control-Allow-Origin'] = '*'
HEADERS['Vary'] = 'Origin'

exports.handler = async (event, context) => {
  try {

    if (req.httpMethod === 'OPTIONS') {
      return { statusCode: '204', HEADERS }
    }
    
    const { address, duration, telegramIds } = JSON.parse(event.body);

    // Validate input
    if (!address || !duration || isNaN(parseInt(duration))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input' }),
      };
    }

    // Save link information to Deta.Base
    const link = await linksTable.put({ address, expirationTime: calculateExpirationTime(duration), telegramIds });

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
