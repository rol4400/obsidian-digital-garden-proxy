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
    const { head, body } = updateAssetUrls(response.data, originalAddress);

    // Return the modified response with head and body separately
    return {
      statusCode: response.status,
      headers: response.headers,
      body: JSON.stringify({ head, body }),
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

    // Parse the HTML content using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Update URLs for assets with the original domain
    const elements = doc.querySelectorAll('[src^="/styles/"], [href^="/styles/"]');
    elements.forEach((element) => {
      const path = element.getAttribute('src') || element.getAttribute('href');
      const resolvedUrl = baseUrl + path;
      element.setAttribute('src', resolvedUrl);
      element.setAttribute('href', resolvedUrl);
    });

    // Serialize the modified document back to HTML
    const updatedContent = new XMLSerializer().serializeToString(doc);

    // Extract head and body sections
    const head = JSON.stringify(doc.head.innerHTML);
    const body = JSON.stringify(doc.body.innerHTML);

    return { head, body };
  } catch (error) {
    console.error('Error in updateAssetUrls:', error);
    return { head: '', body: htmlContent }; // Return the original content for both head and body in case of an error
  }
}
