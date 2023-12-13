// getPageContent.js
const { Deta } = require('deta');
const axios = require('axios');
const cheerio = require('cheerio');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (req, context) => {
  try {

    const { token } = req.queryStringParameters;
  // Check if the token exists
  if (!token) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'text/html',
      },
      body: await getErrorPage(403, "The link given was invalid, please ask for another"),
    };
  }

  // Retrieve link information from Deta.Base
  const linkInfo = await linksTable.get(token);

  // Check if the link has expired
  if (!linkInfo || Date.now() > linkInfo.expirationTime) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'text/html',
      },
      body: await getErrorPage(403, "The link given is invalid or may have expired, please ask for another"),
    };
  }


    // Make an API call to get the page content
    const response = await axios.get(linkInfo.address);

    // Update links and extract head and body sections
    const { head, body }  = updateAssetUrls(response.data, linkInfo.address, "token");

    // Return the modified response
} catch (error) {
    console.error('Error:', error);

    // Customize error response based on the error type
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';

    if (error.response && error.response.status) {
      statusCode = error.response.status;
      errorMessage = `Error: ${error.response.status}`;
    }

    // Return the error response with custom error page
    return {
      statusCode,
      headers: {
        'Content-Type': 'text/html',
      },
      body: await getErrorPage(statusCode, errorMessage),
    };
  }
};

// Update the extractHeadAndBody function in getPageContent.js
function extractHeadAndBody(htmlContent) {
  // Find the first occurrence of <head> and <body>
  const headStartIndex = htmlContent.indexOf('<head>');
  const headEndIndex = htmlContent.indexOf('</head>');
  const bodyStartIndex = htmlContent.indexOf('<body>');
  const bodyEndIndex = htmlContent.indexOf('</body>');

  // If <head> and <body> are found, extract the content
  if (headStartIndex !== -1 && headEndIndex !== -1 && bodyStartIndex !== -1 && bodyEndIndex !== -1) {
    const head = htmlContent.substring(headStartIndex, headEndIndex + '</head>'.length);
    const body = htmlContent.substring(bodyStartIndex + '<body>'.length, bodyEndIndex);

    return { head, body };
  }

  // If not found, return the original content
  return { head: '', body: htmlContent };
}

// Update the updateAssetUrls function
function updateAssetUrls(htmlContent, originalAddress, token) {
    try {
      const $ = cheerio.load(htmlContent);
      const originalDomain = originalAddress.split('/').slice(0, 3).join('/');
  
      // Update URLs for style and script assets with the original domain
      $('link[href], script[src]').each((index, element) => {
        const path = $(element).attr('href') || $(element).attr('src');
        const resolvedUrl = new URL(path, originalDomain).toString();
        $(element).attr('href', resolvedUrl);
        $(element).attr('src', resolvedUrl);
      });
  
      // Update href links to append the token query parameter
      $('a[href^="/"]').each((index, element) => {
        const path = $(element).attr('href');
        const resolvedUrl = new URL(path, originalDomain);
        resolvedUrl.searchParams.set('token', token);
        $(element).attr('href', resolvedUrl.toString());
      });
  
      // Update inline JavaScript fetch calls
      $('script').each((index, element) => {
        const scriptContent = $(element).html();
        if (scriptContent.includes('fetch')) {
          const updatedScript = scriptContent.replace(/fetch\('\/graph.json'\)/g, `fetch('${originalDomain}/graph.json?token=${token}')`);
          $(element).html(updatedScript);
        }
      });
  
      // Serialize the modified document back to HTML
      const updatedContent = $.html();
  
      // Extract head and body sections
      const headBodyContent = extractHeadAndBody(updatedContent);
  
      return headBodyContent;
    } catch (error) {
      console.error('Error in updateAssetUrls:', error);
      return { head: '', body: htmlContent };
    }
  }
  
  // Helper function to get custom error page content
async function getErrorPage(statusCode, errorMessage) {
    try {
      const response = await axios.get(`${process.env.BASE_URL}/${statusCode}.html`);
      return response.data;
    } catch (error) {
      // If the custom error page is not found, return a simple error message
      return `<html><head><title>${errorMessage}</title></head><body><h1>${errorMessage}</h1></body></html>`;
    }
  }