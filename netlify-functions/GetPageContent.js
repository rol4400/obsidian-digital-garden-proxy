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

        // Extract the query string parameters and cookie tokens
        var { token, hash, ...userData } = req.queryStringParameters;
        const tokenCookie = req.headers.cookie;

        // If we don't have a token in the query string, try get one from the existing cookies
        if (!token) {
            if (!tokenCookie || !tokenCookie.includes('token=')) {
                
                // There are no tokens in the query string or the cookies
                console.log("Token not set")
    
                return {
                    statusCode: 403,
                    headers: {
                        'Location': `/403.html`,
                        'Set-Cookie': 'token=; Max-Age=0; Path=/; HttpOnly', // Expire any existing cookie
                    },
                    body: '',
                };
            }
            
            // There is a token in the cookies, use it
            token = tokenCookie.split(';').find(cookie => cookie.trim().startsWith('token=')).split('=')[1];
        } else {

            // There's a token in the query string. If it's not in the cookies yet we should set it not
            if (!tokenCookie || !tokenCookie.includes('token=')) {
                const cookieHeader = `token=${token}; Max-Age=36000; Path=/; HttpOnly`;
    
                console.log("Skipping to auth to set the right cookies")
    
                return {
                    statusCode: 302,
                    headers: {
                        'Location': `/auth.html`,
                        'Content-Type': 'text/html',
                        'Set-Cookie': cookieHeader,
                    },
                    body: 'Setting cookies',
                };
            }
        }

        // Retrieve link information from Deta.Base
        const linkInfo = await linksTable.get(token);

        // Check if the link has expired
        if (linkInfo.expirationTime && Date.now() > linkInfo.expirationTime) {
            console.log("Link expiration time")
            return {
                statusCode: 403,
                headers: {
                    'Location': `/403.html`,
                },
                body: '',
            };
        }

        if (linkInfo.telegramIds) {

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
                        'Location': `/auth.html`,
                    },
                    body: 'Failed Telegram authentication',
                };
            }
    
            console.log(linkInfo.telegramIds);
            console.log(userData["id"]);
    
            // Check if the user is registered
            if (!linkInfo.telegramIds.includes(userData["id"])) {

                console.log("An authenticated telegram ID is required to access this page")

                return {
                    statusCode: 403,
                    headers: {
                        'Location': `/403.html`,
                    },
                    body: 'Telegram ID is not authenticated to access this page',
                };
            }
        }

        // Make an API call to get the page content
       // Extract the current address from the request
        const currentAddress = req.path || req.headers.referer || req.headers.origin;

        // Make an API call to get the page content
        let response;

        // Extract the address path (anything after the domain)
        const currentAddressPath = currentAddress;//.replace(/^\/notes\//, '');
        
        // Append the domain from the address in linkInfo.address
        const modifiedAddress = `${new URL(linkInfo.address).origin}${currentAddressPath}`;

        // Check if the current address is the same as that in linkInfo.address,
        // is a subdirectory of linkInfo.address, or is within the /script, /img, /styles directories
        console.log(currentAddressPath)
        console.log(new URL(linkInfo.address).pathname)
        console.log(`${new URL(linkInfo.address).pathname}/`)

        const isSameOrSubdirectory = (
            currentAddressPath === new URL(linkInfo.address).pathname ||
            currentAddressPath === new URL(linkInfo.address).pathname + "/" ||
            currentAddressPath === "/graph.json" ||
            currentAddressPath === "/favicon.ico" ||
            currentAddressPath.startsWith(`${new URL(linkInfo.address).pathname}/`) ||
            currentAddressPath.startsWith('/script/') ||
            currentAddressPath.startsWith('/img/') ||
            currentAddressPath.startsWith('/styles/')
        );

        if (isSameOrSubdirectory) {
            // Try axios.get
            try {
                // response = await axios.get(modifiedAddress);
                response = await axios.get(modifiedAddress, { responseType: 'arraybuffer' });
            } catch (axiosError) {
                // Handle 404 error by retrying with a modified URL
                if (axiosError.response && axiosError.response.status === 404) {
                    console.log('Retrying with modified URL due to 404 error');

                    // Append the last segment of the original address to itself
                    const lastSegment = currentAddress.match(/\/([^/]+)$/);
                    const modifiedSubdirectoryAddress = lastSegment ? `${new URL(linkInfo.address).origin}${currentAddressPath}/${lastSegment[1]}` : modifiedAddress;

                    // Retry the request with the modified URL
                    response = await axios.get(modifiedSubdirectoryAddress, { responseType: 'arraybuffer' });
                } else {
                    // Re-throw the error if it's not a 404
                    throw axiosError;
                }
            }
        } else {
            // Return error 403
            console.log('You are not authorised to access this page');
            return {
                    statusCode: 403,
                    headers: {
                        'Location': `/403.html`,
                    },
                    body: 'You are not authorised to access this page',
                };
        }

        // Check the Content-Type header
        const contentType = response.headers['content-type'];
        if (contentType.startsWith('text')) {

            // Handle text content (HTML)
            const htmlContent = response.data.toString('utf8');
            
            // Use htmlContent in your HTML
            const {
                head,
                body
            } = extractHeadAndBody(htmlContent);
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: `<html>${head}<body>${body}</body></html>`,
            };

        } else if (contentType.startsWith('image') || contentType.startsWith('video')) {

            // Handle image or video content
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': contentType,
                },
                isBase64Encoded: false,
                body: response.data, // Use binary data directly without conversion
            };
        } else if (contentType.startsWith('application/json')) {

            // Handle JSON content
            const jsonContent = JSON.parse(response.data.toString('utf8'));
            // Use jsonContent in your HTML or other processing
            // For example, if jsonContent is an object with a key 'message':
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: jsonContent.message,
                }),
            };
        } else {
            // Handle other content types as needed
            // ... (existing code for other content types)
            return {
                statusCode: 415,
                headers: {
                },
                body: 'Content type not supported',
            };
        }

        // Inject the warning alert if there is an expiration time
        // var updatedHtml = response.data;
        // if (linkInfo.expirationTime) {
        //     updatedHtml = injectWarningAlert(response.data, linkInfo.expirationTime);
        // }

        // // Update links and extract head and body sections
        // const {
        //     head,
        //     body
        // } = updateAssetUrls(updatedHtml, token);

        // // Return the modified response
        // return {
        //     statusCode: response.status,
        //     headers: {
        //         'Content-Type': 'text/html',
        //     },
        //     body: `<html>${head}<body>${body}</body></html>`,
        // };
    } catch (error) {
        console.error('Error:', error);

        // Return the error response with redirect to the custom error page
        return {
            statusCode: error.statusCode,
            headers: {
                'Location': `/500.html`,
            },
            body: 'Internal server error',
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
function updateAssetUrls(htmlContent, token) {
    try {
        const $ = cheerio.load(htmlContent);

        // Update URLs for styles, scripts, and images
        // $('[href], [src], [srcset]').each((index, element) => {
        //     const attr = $(element).is('[href]') ? 'href' : ($(element).is('[src]') ? 'src' : 'srcset');
        //     const path = $(element).attr(attr);
        //     if (path && path.startsWith('/')) {
        //         const updatedUrl = `${path}?token=${token}`;
        //         $(element).attr(attr, updatedUrl);
        //     }
        // });

        // // Update inline JavaScript fetch calls
        // $('script').each((index, element) => {
        //     const scriptContent = $(element).html();
        //     if (scriptContent.includes('fetch')) {
        //         const updatedScript = scriptContent.replace(/fetch\('([^']+)'\)/g, `fetch('$1?token=${token}')`);
        //         $(element).html(updatedScript);
        //     }
        // });

        // // Update URLs for style and script assets
        // $('link[href], script[src], img[src]').each((index, element) => {
        //     const path = $(element).attr('href') || $(element).attr('src');
        //     if (path.startsWith('/')) {
        //         $(element).attr('href', `${path}?token=${token}`);
        //         $(element).attr('src', `${path}?token=${token}`);
        //     }
        // });

        // // Update href links to append the token query parameter
        // $('a[href^="/"]').each((index, element) => {
        //     const path = $(element).attr('href');
        //     $(element).attr('href', `${path}?token=${token}`);
        // });

        // // Update inline JavaScript fetch calls
        // $('script').each((index, element) => {
        //     const scriptContent = $(element).html();
        //     if (scriptContent.includes('fetch')) {
        //         $(element).html(scriptContent.replace(/fetch\('\/graph.json'\)/g, `fetch('/graph.json?token=${token}')`));
        //     }
        // });

        // Serialize the modified document back to HTML
        var updatedContent = $.html();
        // updatedContent.replace(/url\('([^']+)'\)/g, `url('$1?token=${token}')`);

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

    // Only add the warning alert if we are in a html document
    if (false && htmlContent && htmlContent.includes("<body>")) {
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
    } else {
        return htmlContent;
    }
}