document.addEventListener('DOMContentLoaded', () => {
    const token = getTokenFromUrl();
  
    // Fetch content from the ViewLink function on page load
    fetch(`/.netlify/functions/ViewLink?token=${token}`)
      .then(response => response.json()) // Assuming ViewLink returns JSON with head and body
      .then(data => {
        // Set the body content
        document.body.innerHTML = JSON.parse(data.body);
  
        // Set the head content
        document.head.innerHTML = JSON.parse(data.head);
  
        // Load stylesheets dynamically
        loadStylesheets(data.head);
  
        // Attach click event listener to handle links within the fetched page
        document.addEventListener('click', async (event) => {
          if (event.target.tagName === 'A') {
            event.preventDefault();
  
            const path = event.target.getAttribute('href');
  
            // Fetch new content using the same token
            const response = await fetch(`/.netlify/functions/ViewLink?token=${token}&url=${path}`);
            const newContent = await response.json(); // Assuming ViewLink returns JSON with head and body
  
            // Update the DOM with the new content
            document.head.innerHTML = JSON.parse(newContent.head);
            document.body.innerHTML = JSON.parse(newContent.body);
  
            // Load stylesheets dynamically
            loadStylesheets(newContent.head);
          }
        });
      })
      .catch(error => console.error('Error fetching content:', error));
  
    function loadStylesheets(headContent) {
      // Extract stylesheet URLs from the head content
      const matches = headContent.match(/<link rel="stylesheet" href="(.*?)">/g);
      if (matches) {
        matches.forEach(match => {
          const href = match.match(/href="(.*?)"/)[1];
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        });
      }
    }
  
    function getTokenFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('token') || 'default-token';
    }
  });
  