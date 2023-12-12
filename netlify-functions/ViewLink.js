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
        body: "The link given was invalid, please ask for another",
      };
    }

    // Retrieve link information from Deta.Base
    const linkInfo = await linksTable.get(token);

    // Check if the link has expired
    if (!linkInfo || Date.now() > linkInfo.expirationTime) {
      return {
        statusCode: 403,
        body: "The link given is invalid or may have expired, please ask for another",
      };
    }

    // Fetch content from the original Vercel app address
    const originalAddress = linkInfo.address;
    const response = await axios.get(originalAddress);

    // Modify the fetched HTML content to update URLs for assets
    const modifiedContent = updateAssetUrls(response.data, originalAddress);

    // Return the modified response
    return {
      statusCode: response.status,
      headers: response.headers,
      body: modifiedContent,
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: "Internal Server Error. This is a problem :(",
    };
  }
};

function updateAssetUrls(htmlContent, originalAddress) {
  try {
    const baseUrl = originalAddress.split('/').slice(0, 3).join('/');

    // Replace URLs for assets with the original domain using synchronous replace
    const updatedContent = htmlContent.replace(/(src|href)="(\/styles\/.*?)"/g, (match, attribute, path) => {
      const resolvedUrl = baseUrl + path;
      return `${attribute}="${resolvedUrl}"`;
    });

    console.log(updatedContent);

    return updatedContent;
  } catch (error) {
    console.error('Error in updateAssetUrls:', error);
    return htmlContent; // Return the original content in case of an error
  }
}
