
exports.handler = async (req, context) => {
    try {
        // Extract query parameters from the request
        const { referer, ...queryParams } = req.queryStringParameters;
    
        // Create a string representation of the remaining query parameters
        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
    
        // Set the entire query string as a cookie
        const cookieValue = encodeURIComponent(req.queryString);
        const setCookieHeader = `userData=${queryString}; Path=/;`;
    
        // Construct the redirect URL without the 'referer' parameter
        const redirectUrl = `${referer}?${queryString}`;
    
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
