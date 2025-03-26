# TypeScript Project

A modern TypeScript project setup with best practices.

## Features

- TypeScript 5.x configuration
- Modern ES2022 target
- Development with hot-reloading
- Production build setup
- Proper error handling and logging
- Type checking and declaration files

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Run the compiled application
- `npm run dev` - Start development mode with hot reloading
- `npm run build` - Build the TypeScript project
- `npm run build:watch` - Build and watch for changes
- `npm run clean` - Clean the dist directory
- `npm run rebuild` - Clean and rebuild the project

## Project Structure

```
.
├── src/            # Source files
│   └── index.ts    # Entry point
├── dist/           # Compiled output
├── package.json    # Project configuration
├── tsconfig.json   # TypeScript configuration
└── README.md       # This file
```

## Development

The project is set up with the following development features:

- Strict type checking
- Source maps for debugging
- Hot reloading during development
- Proper error handling and logging
- Clean architecture setup 