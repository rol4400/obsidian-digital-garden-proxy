// getPageContent.js
const axios = require('axios');

exports.handler = async (event, context) => {
  try {
    // Make an API call to get the page content
    const response = await axios.get('https://ryan-obsidian-notes.vercel.app/educations/tgw-s-visit-to-korea/testing/');

    // Update links
    const updatedHTML = updateAssetUrls(response.data);

    // Extract head and body sections
    const { head, body } = extractHeadAndBody(updatedHTML, "https://ryan-obsidian-notes.vercel.app/educations/tgw-s-visit-to-korea/testing/");

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
  
