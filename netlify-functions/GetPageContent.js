// getPageContent.js
const axios = require('axios');

exports.handler = async (event, context) => {
  try {
    // Make an API call to get the page content
    const response = await axios.get('https://ryan-obsidian-notes.vercel.app/educations/tgw-s-visit-to-korea/testing/');

    // Extract head and body sections
    const { head, body } = extractHeadAndBody(response.data);

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

function extractHeadAndBody(htmlContent) {
  // Implement your logic to extract head and body sections
  // For simplicity, let's assume you have specific markers in the HTML

  const headStartIndex = htmlContent.indexOf('<head>');
  const headEndIndex = htmlContent.indexOf('</head>');
  const bodyStartIndex = htmlContent.indexOf('<body>');
  const bodyEndIndex = htmlContent.indexOf('</body>');

  const head = htmlContent.substring(headStartIndex, headEndIndex + '</head>'.length);
  const body = htmlContent.substring(bodyStartIndex + '<body>'.length, bodyEndIndex);

  return { head, body };
}
