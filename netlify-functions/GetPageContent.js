// getPageContent.js
const axios = require('axios');

exports.handler = async (event, context) => {
  try {

    const ORIGINAL_ADDRESS = "https://ryan-obsidian-notes.vercel.app/educations/tgw-s-visit-to-korea/testing/";

    // Make an API call to get the page content
    const response = await axios.get(ORIGINAL_ADDRESS);

    // Update links
    const updatedHTML = updateAssetUrls(response.data, ORIGINAL_ADDRESS, "token");

    // Extract head and body sections
    const { head, body } = extractHeadAndBody(updatedHTML);

    // Return the modified response
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `<html>${head}<body>${body}</body></html>`,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
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

// Update the updateAssetUrls function in getPageContent.js
function updateAssetUrls(htmlContent, originalAddress, token) {
    try {
      const originalDomain = originalAddress.split('/').slice(0, 3).join('/');
  
      // Parse the HTML content using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
  
      // Update URLs for style and script assets with the original domain
      const styleScriptElements = doc.querySelectorAll('link[href], script[src]');
      styleScriptElements.forEach((element) => {
        const path = element.getAttribute('href') || element.getAttribute('src');
        const resolvedUrl = originalDomain + path;
        element.setAttribute('href', resolvedUrl);
        element.setAttribute('src', resolvedUrl);
      });
  
      // Update href links to append the token query parameter
      const hrefElements = doc.querySelectorAll('a[href^="/"]');
      hrefElements.forEach((element) => {
        const path = element.getAttribute('href');
        const resolvedUrl = path + `?token=${token}`;
        element.setAttribute('href', resolvedUrl);
      });
  
      // Serialize the modified document back to HTML
      const updatedContent = new XMLSerializer().serializeToString(doc);
  
      // Extract head and body sections
      const head = doc.head.innerHTML;
      const body = doc.body.innerHTML;
  
      return { head, body };
    } catch (error) {
      console.error('Error in updateAssetUrls:', error);
      return { head: '', body: htmlContent }; // Return the original content for both head and body in case of an error
    }
  }
  