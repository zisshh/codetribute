# Codetribute README

![Codetribute Banner](https://github.com/zisshh/codetribute/banner.jpg) <!-- Add your banner image if available -->

A VS Code extension that supercharges your development workflow with automated GitHub repository management, intelligent activity tracking, and AI-powered insights.

## Features

🚀 **One-Click Repository Creation**
- Instant GitHub repo creation directly from VS Code
- Automatic initialization with default branch

📊 **Smart Activity Tracking**
- Real-time monitoring of file changes (create/modify/delete)
- Automatic work log generation with timestamps
- File change summaries with code snippets

🤖 **AI-Powered Insights** (requires Groq API key)
- Automated activity summarization using Groq's LLM
- Configurable summary templates
- Support for multiple AI models (Llama-3, Mixtral, etc.)

🔄 **Automatic Sync**
- Hourly log synchronization with GitHub
- Conflict resolution with SHA verification
- Branch-specific updates

⚙️ **Workspace Integration**
- Automatic log file management
- Workspace-specific tracking
- Configurable tracking patterns

## Requirements

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [VS Code](https://code.visualstudio.com/) (v1.75+)
- GitHub Account (for repository operations)
- [Groq API Key](https://console.groq.com/) (for AI features)

## Extension Settings

Configure through `File > Preferences > Settings`:

```json
{
  "codetribute.groqApiKey": "your-api-key-here",
  "codetribute.syncInterval": 60,
  "codetribute.trackedPatterns": ["**/*"],
}

  Getting Started

Install from VS Code Marketplace

Configure GitHub authentication (Ctrl+Shift+P > Codetribute: Login)

Set Groq API key in settings (for AI features)

Open workspace folder to start tracking
