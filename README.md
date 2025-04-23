# SpecGen Server

The Express backend API for SpecGen, providing endpoints for managing categories and parameters, as well as generating fiction through OpenAI integration.

## Features

- RESTful API endpoints for categories and parameters
- OpenAI integration for fiction generation
- Swagger API documentation
- JSON file-based data storage
- Environment-based configuration

## Prerequisites

- Node.js (version 14+ recommended)
- npm
- OpenAI API key

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the server directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`
   - Set the port: `PORT=3000`
   - Set the environment: `NODE_ENV=development`

3. Start the server:
   ```bash
   npm run dev  # For development with nodemon
   npm start    # For production
   ```

## API Endpoints

### Categories
- `GET /api/categories`: List all categories
- `GET /api/categories/:id`: Get category details
- `POST /api/categories`: Create category
- `PUT /api/categories/:id`: Update category
- `DELETE /api/categories/:id`: Delete category

### Parameters
- `GET /api/parameters`: List all parameters
- `GET /api/parameters/:id`: Get parameter details
- `POST /api/parameters`: Create parameter
- `PUT /api/parameters/:id`: Update parameter
- `DELETE /api/parameters/:id`: Delete parameter

### Generation
- `POST /api/generate`: Send parameters to AI service to generate fiction

## Data Structure

Categories and parameters are stored in a JSON file with the following structure:

```json
{
  "categories": [
    {
      "id": "science-fiction",
      "name": "Science Fiction",
      "visibility": "Show"
    }
  ],
  "parameters": [
    {
      "id": "science-fiction-technology-level",
      "name": "Technology Level",
      "type": "Dropdown",
      "visibility": "Basic",
      "categoryId": "science-fiction",
      "values": [
        {"id": "near-future", "label": "Near Future"},
        {"id": "advanced", "label": "Advanced"}
      ]
    }
  ]
}
```

## Parameter Types

- **Dropdown**: 4-12 selectable values
- **Slider**: Min/max value configuration
- **Toggle Switch**: Two options (binary choice)
- **Radio Buttons**: 4-7 mutually exclusive options
- **Checkbox**: 4-7 multi-selectable options

## API Documentation

Access Swagger UI:
- Open `http://localhost:3000/api-docs` in your browser

## Testing

Run tests:
```bash
npm test
```

## Technologies

- Express.js
- Node.js
- OpenAI API
- JSON file-based storage
- Jest for testing
- Swagger for API documentation 