import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

// Initialize cache map
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes in milliseconds

const clearCache = (key) => {
  cache.delete(key);
};

const getCachedData = (key) => {
  const data = cache.get(key);
  if (data && Date.now() - data.timestamp < CACHE_TTL) {
    return data.value;
  }
  return null;
};

const setCachedData = (key, value) => {
  cache.set(key, {
    value,
    timestamp: Date.now()
  });
};

export default async function handler(req, res) {
  const { method, query: { id } } = req;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // Get single page
          const cachedPage = getCachedData(`page-${id}`);
          if (cachedPage) {
            return res.json(cachedPage);
          }

          const page = await notion.pages.retrieve({ page_id: id });
          const formattedPage = {
            id: page.id,
            title: page.properties.title?.title[0]?.plain_text || 'Untitled',
            description: page.properties.description?.rich_text[0]?.plain_text || '',
            author: page.properties.author?.rich_text[0]?.plain_text || '',
            imageUrl: page.properties.imageurl?.url || null,
            link: page.properties.link?.url || null,
            image: page.properties.image?.files[0]?.file?.url || page.properties.image?.files[0]?.external?.url || null,
            lastEdited: page.last_edited_time
          };

          setCachedData(`page-${id}`, formattedPage);
          res.json(formattedPage);
        } else {
          // Get all pages
          const cachedPages = getCachedData('pages');
          if (cachedPages) {
            return res.json(cachedPages);
          }

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

          setCachedData('pages', pages);
          res.json(pages);
        }
        break;

      case 'POST':
        const { title, description, author, imageUrl, link, image } = req.body;

        const newPage = await notion.pages.create({
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

        clearCache('pages');
        res.json({ message: 'Page created successfully', page: newPage });
        break;

      case 'PATCH':
        if (!id) {
          return res.status(400).json({ error: 'Page ID is required' });
        }

        const updateData = req.body;
        const properties = {};

        if (updateData.title) {
          properties.title = {
            title: [{ text: { content: updateData.title } }]
          };
        }

        if (updateData.description) {
          properties.description = {
            rich_text: [{ text: { content: updateData.description } }]
          };
        }

        if (updateData.author) {
          properties.author = {
            rich_text: [{ text: { content: updateData.author } }]
          };
        }

        if (updateData.imageUrl) {
          properties.imageurl = {
            url: updateData.imageUrl
          };
        }

        if (updateData.link) {
          properties.link = {
            url: updateData.link
          };
        }

        if (updateData.image) {
          properties.image = {
            files: [{ external: { url: updateData.image } }]
          };
        }

        const updatedPage = await notion.pages.update({
          page_id: id,
          properties
        });

        clearCache('pages');
        clearCache(`page-${id}`);
        res.json({ message: 'Page updated successfully', page: updatedPage });
        break;

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ error: 'Page ID is required' });
        }

        await notion.pages.update({
          page_id: id,
          archived: true
        });

        clearCache('pages');
        clearCache(`page-${id}`);
        res.json({ message: 'Page deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Notion API Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      code: error.code
    });
  }
} 