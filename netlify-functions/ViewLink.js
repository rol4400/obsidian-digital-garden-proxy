const { Deta } = require('deta');
const axios = require('axios');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (event, context) => {
  try {
    const { token } = event.queryStringParameters;

    // Check if the token exists
    if (!token) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid link' }),
      };
    }

    // Retrieve link information from Deta.Base
    const linkInfo = await linksTable.get(token);

    // Check if the link has expired
    if (!linkInfo || Date.now() > linkInfo.expirationTime) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid or expired link' }),
      };
    }

    // Fetch content from the original Vercel app address
    const originalAddress = linkInfo.address;
    const response = await axios.get(originalAddress);

    // Modify the fetched HTML content to update URLs for assets
    const modifiedContent = updateAssetUrls(response.data, originalAddress);

    return {
      statusCode: response.status,
      headers: response.headers,
      body: modifiedContent,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

function updateAssetUrls(htmlContent, originalAddress) {
    try {
      const baseUrl = originalAddress.split('/').slice(0, 3).join('/');
  
      // Split the HTML content by attribute and handle replacements synchronously
      const parts = htmlContent.split(/(src|href)="(\/styles\/.*?)"/);
      let updatedContent = '';
  
      for (let i = 0; i < parts.length; i += 3) {
        updatedContent += parts[i];
        if (i + 1 < parts.length) {
          const path = parts[i + 1];
          const resolvedUrl = baseUrl + path;
          updatedContent += `src="${resolvedUrl}"`;
        }
      }
  
      console.log(updatedContent);
  
      return updatedContent;
    } catch (error) {
      console.error('Error in updateAssetUrls:', error);
      return htmlContent; // Return the original content in case of an error
    }
  }