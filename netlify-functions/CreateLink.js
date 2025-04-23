// netlify-functions/CreateLink.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Generate a unique token
    const token = generateUniqueToken();
    const expirationTime = calculateExpirationTime(duration);

    // Save link information to Supabase
    const { data, error } = await supabase
      .from('obsidian_links')
      .insert([{ 
        id: token,
        address,
        expiration_time: expirationTime,
        telegram_ids: telegramIds || [],
        created_at: new Date()
      }]);

    if (error) {
      console.error('Error inserting data:', error);
      return {
        statusCode: 500,
        HEADERS,
        body: JSON.stringify({ error: 'Database Error' }),
      };
    }

    return {
      statusCode: 200,
      HEADERS,
      body: JSON.stringify({ 
        link: "https://ryan-notes.netlify.app/?token=" + token, 
        token: token, 
        expirationTime: expirationTime 
      }),
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

function generateUniqueToken() {
  // Generate a random string of characters
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
}
