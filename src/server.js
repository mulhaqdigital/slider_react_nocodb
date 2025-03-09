require('dotenv').config();
const express = require('express');
const { Client } = require('@notionhq/client');
const NodeCache = require('node-cache');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

// Initialize cache
const cache = new NodeCache({
  stdTTL: process.env.CACHE_TTL || 300,
  checkperiod: 120
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// API endpoint to fetch cards
app.get('/api/cards', async (req, res) => {
  try {
    console.log('Fetching data from Notion...');
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [
        {
          property: 'title',
          direction: 'ascending',
        },
      ],
    });

    console.log('Processing Notion response...');
    const cards = response.results.map(page => ({
      id: page.id,
      title: page.properties.title?.title[0]?.plain_text || 'Untitled',
      description: page.properties.description?.rich_text[0]?.plain_text || '',
      author: page.properties.author?.rich_text[0]?.plain_text || '',
      imageurl: page.properties.imageurl?.url || null,
      link: page.properties.link?.url || null,
      image: page.properties.image?.files[0]?.file?.url || page.properties.image?.files[0]?.external?.url || null
    }));

    console.log('Sending response...');
    res.json(cards);
  } catch (error) {
    console.error('Error fetching data from Notion:', error);
    res.status(500).json({
      error: 'Failed to fetch cards',
      details: error.message
    });
  }
});

// Cache middleware
const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log(`Cache hit for ${key}`);
    return res.json(cachedResponse);
  }

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    code: err.code
  });
};

// Routes

// Get all pages from database
app.get('/api/pages', cacheMiddleware, async (req, res, next) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      sorts: [{ property: 'title', direction: 'ascending' }],
    });

    const pages = response.results.map(page => ({
      id: page.id,
      title: page.properties.title?.title[0]?.plain_text || 'Untitled',
      description: page.properties.description?.rich_text[0]?.plain_text || '',
      author: page.properties.author?.rich_text[0]?.plain_text || '',
      imageUrl: page.properties.imageurl?.url || null,
      link: page.properties.link?.url || null,
      image: page.properties.image?.files[0]?.file?.url || page.properties.image?.files[0]?.external?.url || null,
      lastEdited: page.last_edited_time
    }));

    // Cache the response
    cache.set(req.originalUrl, pages);

    res.json(pages);
  } catch (error) {
    next(error);
  }
});

// Get single page by ID
app.get('/api/pages/:id', cacheMiddleware, async (req, res, next) => {
  try {
    const response = await notion.pages.retrieve({
      page_id: req.params.id
    });

    const page = {
      id: response.id,
      title: response.properties.title?.title[0]?.plain_text || 'Untitled',
      description: response.properties.description?.rich_text[0]?.plain_text || '',
      author: response.properties.author?.rich_text[0]?.plain_text || '',
      imageUrl: response.properties.imageurl?.url || null,
      link: response.properties.link?.url || null,
      image: response.properties.image?.files[0]?.file?.url || response.properties.image?.files[0]?.external?.url || null,
      lastEdited: response.last_edited_time
    };

    // Cache the response
    cache.set(req.originalUrl, page);

    res.json(page);
  } catch (error) {
    next(error);
  }
});

// Create new page
app.post('/api/pages', async (req, res, next) => {
  try {
    const { title, description, author, imageUrl, link, image } = req.body;

    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        },
        description: {
          rich_text: [{ text: { content: description } }]
        },
        author: {
          rich_text: [{ text: { content: author } }]
        },
        imageurl: {
          url: imageUrl
        },
        link: {
          url: link
        },
        image: {
          files: [{ external: { url: image } }]
        }
      }
    });

    // Clear cache for pages list
    cache.del('/api/pages');

    res.json({
      message: 'Page created successfully',
      page: response
    });
  } catch (error) {
    next(error);
  }
});

// Update page
app.patch('/api/pages/:id', async (req, res, next) => {
  try {
    const { title, description, author, imageUrl, link, image } = req.body;

    const response = await notion.pages.update({
      page_id: req.params.id,
      properties: {
        ...(title && {
          title: {
            title: [{ text: { content: title } }]
          }
        }),
        ...(description && {
          description: {
            rich_text: [{ text: { content: description } }]
          }
        }),
        ...(author && {
          author: {
            rich_text: [{ text: { content: author } }]
          }
        }),
        ...(imageUrl && {
          imageurl: {
            url: imageUrl
          }
        }),
        ...(link && {
          link: {
            url: link
          }
        }),
        ...(image && {
          image: {
            files: [{ external: { url: image } }]
          }
        })
      }
    });

    // Clear related caches
    cache.del('/api/pages');
    cache.del(`/api/pages/${req.params.id}`);

    res.json({
      message: 'Page updated successfully',
      page: response
    });
  } catch (error) {
    next(error);
  }
});

// Delete page
app.delete('/api/pages/:id', async (req, res, next) => {
  try {
    await notion.pages.update({
      page_id: req.params.id,
      archived: true
    });

    // Clear related caches
    cache.del('/api/pages');
    cache.del(`/api/pages/${req.params.id}`);

    res.json({
      message: 'Page deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Apply error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    databaseId: process.env.NOTION_DATABASE_ID,
    cacheEnabled: true,
    cacheTTL: process.env.CACHE_TTL || 300
  });
}); 