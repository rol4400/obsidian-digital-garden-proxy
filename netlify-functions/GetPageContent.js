// getPageContent.js
const {
    Deta
} = require('deta');
const axios = require('axios');
const cheerio = require('cheerio');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (req, context) => {
    try {

        const {
            token
        } = req.queryStringParameters;

        // Check if the token exists
        if (!token) {
            return {
                statusCode: 302,
                headers: {
                    'Location': `403.html`,
                },
                body: '',
            };
        }

        // Retrieve link information from Deta.Base
        const linkInfo = await linksTable.get(token);

        // Check if the link has expired
        if (!linkInfo || Date.now() > linkInfo.expirationTime) {
            return {
                statusCode: 302,
                headers: {
                    'Location': `403.html`,
                },
                body: '',
            };
        }

        // Make an API call to get the page content
        const response = await axios.get(linkInfo.address);

        // Inject the warning alert
        const updatedHtml = injectWarningAlert(response.data, linkInfo.expirationTim);

        // Update links and extract head and body sections
        const {
            head,
            body
        } = updateAssetUrls(updatedHtml, linkInfo.address, "token");

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

        // Customize error response based on the error type
        let statusCode = 500;

        if (error.response && error.response.status) {
            statusCode = error.response.status;
        }

        // Return the error response with redirect to the custom error page
        return {
            statusCode: 500,
            headers: {
                'Location': `${statusCode}.html`,
            },
            body: '',
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

        return {
            head,
            body
        };
    }

    // If not found, return the original content
    return {
        head: '',
        body: htmlContent
    };
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
        return {
            head: '',
            body: htmlContent
        };
    }
}

function injectWarningAlert(htmlContent, expirationTime) {
    try {
        const $ = cheerio.load(htmlContent);

        // Calculate days remaining
        const daysRemaining = Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24));

        // Create the warning message
        const warningMessage = `This link will expire in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;

        // Construct the warning alert HTML
        const warningAlert = `
            <div id="toast" class="show">
                <div id="img">Icon</div>
                <div id="desc">${warningMessage}</div>
            </div>
            <style>
                #toast {
                    visibility: hidden;
                    max-width: 50px;
                    height: 50px;
                    margin: auto;
                    background-color: #ffa500; /* Orange color */
                    color: #fff;
                    text-align: center;
                    border-radius: 2px;
                    position: fixed;
                    z-index: 1;
                    left: 0;
                    right: 0;
                    top: 0; /* Fixed position at the top */
                    font-size: 17px;
                    white-space: nowrap;
                }
                #toast #img {
                    width: 50px;
                    height: 50px;
                    float: left;
                    padding-top: 16px;
                    padding-bottom: 16px;
                    box-sizing: border-box;
                    background-color: #111;
                    color: #fff;
                }
                #toast #desc {
                    color: #fff;
                    padding: 16px;
                    overflow: hidden;
                    white-space: nowrap;
                }
                #toast.show {
                    visibility: visible;
                    -webkit-animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 2s, fadeout 0.5s 2.5s;
                    animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 4s, fadeout 0.5s 4.5s;
                }
                @-webkit-keyframes fadein {
                    from { bottom: 0; opacity: 0; }
                    to { bottom: 30px; opacity: 1; }
                }
                @keyframes fadein {
                    from { bottom: 0; opacity: 0; }
                    to { bottom: 30px; opacity: 1; }
                }
                @-webkit-keyframes expand {
                    from { min-width: 50px; }
                    to { min-width: 350px; }
                }
                @keyframes expand {
                    from { min-width: 50px; }
                    to { min-width: 350px; }
                }
                @-webkit-keyframes stay {
                    from { min-width: 350px; }
                    to { min-width: 350px; }
                }
                @keyframes stay {
                    from { min-width: 350px; }
                    to { min-width: 350px; }
                }
                @-webkit-keyframes shrink {
                    from { min-width: 350px; }
                    to { min-width: 50px; }
                }
                @keyframes shrink {
                    from { min-width: 350px; }
                    to { min-width: 50px; }
                }
                @-webkit-keyframes fadeout {
                    from { bottom: 30px; opacity: 1; }
                    to { bottom: 60px; opacity: 0; }
                }
                @keyframes fadeout {
                    from { bottom: 30px; opacity: 1; }
                    to { bottom: 60px; opacity: 0; }
                }
            </style>
            <script>
                document.addEventListener("DOMContentLoaded", function () {
                    function launch_toast() {
                        var x = document.getElementById("toast");
                        x.className = "show";
                        setTimeout(function () { x.className = x.className.replace("show", ""); }, 5000);
                    }
                    setTimeout(launch_toast, 1000); // Add 1-second delay
                });
            </script>
        `;

        // Inject the warning alert at the beginning of the body
        $('body').prepend(warningAlert);

        // Serialize the modified document back to HTML
        const updatedContent = $.html();

        return updatedContent;
    } catch (error) {
        console.error('Error in injectWarningAlert:', error);
        return htmlContent;
    }
}