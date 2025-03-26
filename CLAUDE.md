# Gemini Flash Development Guidelines

## Build Commands
- `npm start`: Run compiled app
- `npm run dev`: Run with hot reloading
- `npm run build`: Compile TypeScript
- `npm run build:watch`: Compile with watch mode
- `npm run clean`: Remove dist directory
- `npm run rebuild`: Clean and rebuild

## Code Style
1. **Indentation**: 2 spaces
2. **Strings**: Double quotes
3. **Semicolons**: Required
4. **Imports**: Group related imports, Node built-ins first
5. **Types**: Use TypeScript strict mode, explicit parameter/return types
6. **Naming**: camelCase for variables/functions, descriptive names
7. **Error Handling**: Try/catch for async, prefix console.error messages with file path
8. **Comments**: // style with src/file.ts: prefix

## Environment
- Requires GOOGLE_GEMINI_API_KEY in .env
- Node v18+ / npm v8+

## Project Structure
- `/src`: TypeScript source files
- `/public`: Static assets, HTML frontend
- `/dist`: Compiled JavaScript (don't edit)
- `/docs`: Documentation