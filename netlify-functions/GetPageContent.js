// getPageContent.js
const {
    Deta
} = require('deta');

const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');
const crypto = require('crypto');

const deta = Deta(process.env.DETA_PROJECT_KEY);
const linksTable = deta.Base('Obsidian_Links');

exports.handler = async (req, context) => {
    try {

        // const {
        //     token
        // } = req.queryStringParameters;
        const { token, hash, ...userData } = req.queryStringParameters;

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

        // Extract key for telegram ID
        const botToken = process.env.TELE_BOT_TOKEN; // Replace with your actual Telegram bot token
        const secretKey =  crypto.createHash('sha256')
            .update(botToken)
            .digest();

        // this is the data to be authenticated i.e. telegram user id, first_name, last_name etc.
        const dataCheckString = Object.keys(userData)
            .sort()
            .map(key => (`${key}=${userData[key]}`))
            .join('\n');

        // run a cryptographic hash function over the data to be authenticated and the secret
        const hmac =  crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Invalid login hash
        if (hmac !== hash) {
            return {
                statusCode: 302,
                headers: {
                    'Location': `auth.html`,
                },
                body: 'Failed Telegram authentication',
            };
        }

        // Check if the user is registered
        if (!linkInfo.telegramIds.includes(userTelegramId)) {
            return {
                statusCode: 302,
                headers: {
                    'Location': `403.html`,
                },
                body: 'Telegram ID is not authenticated to access this page',
            };
        }

        // Make an API call to get the page content
        const response = await axios.get(linkInfo.address);

        // Inject the warning alert
        const updatedHtml = injectWarningAlert(response.data, linkInfo.expirationTime);

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
        const timeRemaining = moment(expirationTime).fromNow(true);

        // Create the warning message
        const warningMessage = `This link will expire in ${timeRemaining}`;

        // Construct the warning alert HTML
        const warningAlert = `
            <div id="toast" class="">
                <div id="img"><svg style="color: white" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16"> <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z" fill="white"></path> <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z" fill="white"></path> <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z" fill="white"></path> </svg></div>
                <div id="desc">${warningMessage}</div>
            </div>

           <style>
                #toast {
                    visibility: hidden;
                    max-width: 50px;
                    max-height: 50px;
                    overflow: hidden !important;
                    height: 50px;
                    margin: auto;
                    color: #fff;
                    text-align: center;
                    border-radius: 2px;
                    position: fixed;
                    z-index: 1;
                    left: 0;
                    right: 0;
                    top: 30px;
                    font-size: 17px;
                    white-space: nowrap;
                    font-family: "Times New Roman";
                }

                #toast #img {
                    width: 50px;
                    height: 50px;
                    float: left;
                    padding-top: 16px;
                    padding-bottom: 16px;
                    box-sizing: border-box;
                    background-color: #ff8c00; /* Orange color */
                    color: #fff;
                    font-size: 24px; /* Adjust the font size as needed */
                    border-radius: 50%; /* Make it a circle */
                    text-align: center;
                }

                #toast #desc {
                    color: #fff;
                    background-color: #333;
                    padding: 14px;
                    overflow: hidden !important;
                    white-space: nowrap !important;
                    font-family: "Times New Roman";
                }

                #toast.show {
                    visibility: visible;
                    -webkit-animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 2s, fadeout 0.5s 2.5s;
                    animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 4s, fadeout 0.5s 4.5s;
                }
                @-webkit-keyframes fadein {
                    from { top: 0; opacity: 0; }
                    to { top: 30px; opacity: 1; }
                }
                @keyframes fadein {
                    from { top: 0; opacity: 0; }
                    to { top: 30px; opacity: 1; }
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
                    to { min-width: 0px; }
                }
                @keyframes shrink {
                    from { min-width: 350px; }
                    to { min-width: 0px; }
                }
                @-webkit-keyframes fadeout {
                    from { top: 30px; opacity: 1; visibility: visible }
                    to { top: 0px; opacity: 0; visibility: hidden }
                }
                @keyframes fadeout {
                    from { top: 30px; opacity: 1; visibility: visible }
                    to { top: 0px; opacity: 0; visibility: hidden }
                }
            </style>
            <script>
                document.addEventListener("DOMContentLoaded", function () {
                    function launch_toast() {
                        var x = document.getElementById("toast");
                        x.className = "show";
                        setTimeout(function () { x.className = x.className.replace("show", ""); }, 4500);
                    }
                    setTimeout(launch_toast, 2000); // Add 2-second delay
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