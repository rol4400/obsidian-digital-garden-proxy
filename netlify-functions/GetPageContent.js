// getPageContent.js
const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  try {

    const ORIGINAL_ADDRESS = "https://ryan-obsidian-notes.vercel.app/educations/tgw-s-visit-to-korea/testing/";

    // Make an API call to get the page content
    const response = await axios.get(ORIGINAL_ADDRESS);

    // Update links and extract head and body sections
    const { head, body }  = updateAssetUrls(response.data, ORIGINAL_ADDRESS, "token");

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
  
      // Update specific URLs like "/graph.json" to refer to the original domain
      $('[href="/graph.json"], [src="/graph.json"]').each((index, element) => {
        const resolvedUrl = new URL('/graph.json', originalDomain).toString();
        $(element).attr('href', resolvedUrl);
        $(element).attr('src', resolvedUrl);
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
  
  