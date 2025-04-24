# SpecGen Settings API

This document provides detailed information about the SpecGen settings API, available configuration options, and example payloads.

## Settings Structure

The SpecGen settings are organized in a hierarchical structure:

```json
{
  "ai": {
    "models": {
      "fiction": "gpt-4o-mini",
      "image": "dall-e-3"
    },
    "parameters": {
      "fiction": {
        "temperature": 0.8,
        "max_tokens": 1000,
        "default_story_length": 500,
        "system_prompt": "You are a speculative fiction generator that creates compelling, imaginative stories based on the parameters provided by the user."
      },
      "image": {
        "size": "1024x1024",
        "quality": "standard",
        "prompt_suffix": "Use high-quality, photorealistic rendering with attention to lighting, detail, and composition. The image should be visually cohesive and striking."
      }
    }
  },
  "defaults": {
    "content_type": "fiction"
  }
}
```

## Available Settings

### AI Models

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `ai.models.fiction` | Model used for fiction generation | `gpt-4o-mini` | Any valid OpenAI model name |
| `ai.models.image` | Model used for image generation | `dall-e-3` | Any valid OpenAI image model name |

### Fiction Parameters

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `ai.parameters.fiction.temperature` | Temperature for text generation | `0.8` | `0.0` to `2.0` |
| `ai.parameters.fiction.max_tokens` | Maximum tokens to generate | `1000` | Any positive integer |
| `ai.parameters.fiction.default_story_length` | Default story length in words | `500` | Any positive integer |
| `ai.parameters.fiction.system_prompt` | System prompt for fiction generation | *See default settings* | Any valid prompt string |

### Image Parameters

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `ai.parameters.image.size` | Size of generated images | `1024x1024` | `256x256`, `512x512`, `1024x1024`, `1792x1024`, `1024x1792` |
| `ai.parameters.image.quality` | Quality of generated images | `standard` | `standard`, `hd` |
| `ai.parameters.image.prompt_suffix` | Text appended to all image prompts | *See default settings* | Any string |

### Default Settings

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `defaults.content_type` | Default content type for generation | `fiction` | `fiction`, `image` |

## API Endpoints

### Get All Settings

```http
GET /api/settings
```

**Response:**

```json
{
  "success": true,
  "data": {
    "ai": {
      "models": { ... },
      "parameters": { ... }
    },
    "defaults": { ... }
  }
}
```

### Update Settings

```http
PUT /api/settings
```

**Request Body:**
You only need to include the settings you want to modify. The update will be merged with existing settings.

### Example: Update Fiction Model

```json
{
  "ai": {
    "models": {
      "fiction": "gpt-4"
    }
  }
}
```

### Example: Update Fiction Parameters

```json
{
  "ai": {
    "parameters": {
      "fiction": {
        "temperature": 0.9,
        "max_tokens": 2000
      }
    }
  }
}
```

### Example: Update Image Parameters

```json
{
  "ai": {
    "parameters": {
      "image": {
        "size": "1792x1024",
        "quality": "hd"
      }
    }
  }
}
```

### Example: Update Default Content Type

```json
{
  "defaults": {
    "content_type": "image"
  }
}
```

### Example: Update System Prompt

```json
{
  "ai": {
    "parameters": {
      "fiction": {
        "system_prompt": "You are a writer of hard science fiction focusing on plausible near-future technology."
      }
    }
  }
}
```

### Reset Settings

```http
POST /api/settings/reset
```

Resets all settings to their default values.

## Best Practices

1. **Partial Updates**: Only include the settings you want to change in your update request.
2. **Temperature**: Lower values (e.g., 0.2-0.5) produce more focused, predictable output. Higher values (e.g., 0.8-1.0) produce more creative, varied output.
3. **Tokens**: For fiction, 1000 tokens is approximately 750 words. Adjust `max_tokens` based on your desired story length.
4. **System Prompt**: Customize the system prompt to guide the AI toward specific writing styles or genres.
5. **Image Prompts**: The `prompt_suffix` is appended to all image prompts, allowing you to enforce consistent style across all generated images.
