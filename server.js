const express = require('express');
const { Client } = require('@notionhq/client');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Verify database access on startup
async function verifyDatabaseAccess() {
  try {
    console.log('Verifying database access...');
    console.log('Database ID:', process.env.NOTION_DATABASE_ID);
    
    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log('Database access verified successfully!');
    console.log('Database title:', response.title[0]?.plain_text);
    console.log('Available properties:', Object.keys(response.properties));
    return true;
  } catch (error) {
    console.error('Database access verification failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.code === 'object_not_found') {
      console.error('IMPORTANT: Make sure to:');
      console.error('1. Check if the database ID is correct');
      console.error('2. Share the database with your integration');
      console.error('3. Verify your integration has the correct capabilities enabled');
    }
    return false;
  }
}

// API endpoint to fetch cards from Notion
app.get('/api/cards', async (req, res) => {
  try {
    console.log('Attempting to fetch data from Notion database...');
    
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [
        {
          property: 'title',
          direction: 'ascending',
        },
      ],
    });

    console.log('Database query successful');
    console.log('Number of results:', response.results.length);

    if (!response.results || response.results.length === 0) {
      console.log('No results found in the database');
      return res.json([]);
    }

    const formattedCards = response.results.map((page, index) => {
      console.log(`Processing page ${index + 1}:`, page.id);
      
      // Extract property values with detailed error checking
      const title = page.properties.title?.title[0]?.plain_text;
      const description = page.properties.description?.rich_text[0]?.plain_text;
      const author = page.properties.author?.rich_text[0]?.plain_text;
      const imageUrl = page.properties.imageurl?.url;
      const link = page.properties.link?.url;
      const image = page.properties.image?.files[0]?.file?.url || 
                   page.properties.image?.files[0]?.external?.url;

      // Log extracted values for debugging
      console.log('Extracted values:', {
        title,
        description: description?.substring(0, 50) + '...',
        author,
        imageUrl,
        link,
        image
      });

      return {
        title: title || 'Untitled',
        description: description || 'No description available',
        author: author || 'Unknown',
        imageUrl: imageUrl || null,
        link: link || null,
        image: image || null,
      };
    });

    console.log('Successfully formatted all cards');
    res.json(formattedCards);
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status
    });

    res.status(500).json({ 
      error: 'Failed to load cards',
      details: error.message,
      code: error.code,
      help: 'Please make sure the integration has access to the database and try again.'
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  
  // Verify database access on startup
  const databaseAccessible = await verifyDatabaseAccess();
  if (!databaseAccessible) {
    console.error('WARNING: Database access verification failed. The application may not work correctly.');
  }
}); 