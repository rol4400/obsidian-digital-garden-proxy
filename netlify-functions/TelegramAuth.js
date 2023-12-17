
exports.handler = async (event) => {
    // Extract query parameters from the request
    const { referer, ...queryParams } = event.queryStringParameters;

    // Create a string representation of the remaining query parameters
    const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

    // Set the entire query string as a cookie
    const cookieValue = encodeURIComponent(event.rawQueryString);
    const setCookieHeader = `Set-Cookie: userDatay=${cookieValue}; Path=/;`;

    // Construct the redirect URL without the 'referer' parameter
    const redirectUrl = `/${referer}?${queryString}`;

    // Return a response with the redirect and cookie headers
    return {
        statusCode: 302,
        headers: {
            Location: redirectUrl,
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/plain',
            'Set-Cookie': setCookieHeader,
        },
        body: 'Redirecting...',
    };
};
