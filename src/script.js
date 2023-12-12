// src/script.js

document.addEventListener('DOMContentLoaded', () => {
    const token = getTokenFromUrl(); // Extract token from the URL
  
    // Fetch content from the ViewLink function on page load
    fetch(`/.netlify/functions/ViewLink?token=${token}`)
      .then(response => response.text())
      .then(data => {
        document.body.innerHTML = data;
  
        // Attach click event listener to handle links within the fetched page
        document.addEventListener('click', async (event) => {
          if (event.target.tagName === 'A') {
            event.preventDefault();
  
            const path = event.target.getAttribute('href');
  
            // Fetch new content using the same token
            const response = await fetch(`/.netlify/functions/ViewLink?token=${token}&url=${path}`);
            const newContent = await response.text();
  
            // Update the DOM with the new content
            document.body.innerHTML = newContent;
          }
        });
      })
      .catch(error => console.error('Error fetching content:', error));
  
    function getTokenFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('token') || 'default-token'; // Use a default token if not found
    }
  });
  