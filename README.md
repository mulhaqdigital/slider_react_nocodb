# NocoDB Card Slider

A responsive card slider component built with React that fetches and displays data from NocoDB.

## Features

- Fetches data from NocoDB API
- Responsive card layout
- Smooth horizontal scrolling
- Image loading with fallback
- Error handling
- Loading states
- Navigation buttons

## Setup

1. Clone the repository
2. Open `index.html` in your browser
3. Update the NocoDB configuration in the `fetchCards` function:
   - Update the table ID (`msvdzpdvnlr06r0`)
   - Update the view ID (`vwlr2utkuotlfa2f`)
   - Update your API token

## NocoDB Configuration

The slider expects the following columns in your NocoDB table:
- `title`: Card title
- `description`: Card description
- `author`: Author name
- `imageurl`: URL of the card image
- `link`: (Optional) URL to open when clicking the card

## Dependencies

- React 18
- ReactDOM 18
- Babel (for JSX transformation)
- Axios (for API requests)

## License

MIT 