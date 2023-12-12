// netlify-functions/ViewLink.js

const { Deta } = require('deta');
const axios = require('axios');
const { parse, resolve } = require('url');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (event, context) => {
  try {
    const { token, url } = event.queryStringParameters;

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
    // Extract the origin from the originalAddress
    const baseUrl = originalAddress.split('/').slice(0, 3).join('/');
  
    // Use a regular expression to update URLs for assets
    const updatedContent = htmlContent.replace(/(src|href)="(?!http|\/)(.*?)"/g, (_, attribute, path) => {
      // Check if path is undefined before attempting to resolve it
      const resolvedUrl = path ? baseUrl + '/' + path : '';
      return `${attribute}="${resolvedUrl}"`;
    });
  
    return updatedContent;
  }
  