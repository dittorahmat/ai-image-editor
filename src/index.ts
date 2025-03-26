// src/index.ts: Entry point of the application

// Example interface
interface Greeting {
  message: string;
  timestamp: Date;
}

// Example function with type safety
function createGreeting(name: string): Greeting {
  console.log('src/index.ts: Creating greeting for', name);
  return {
    message: `Hello, ${name}! Welcome to your TypeScript project.`,
    timestamp: new Date()
  };
}

// Example async function
async function main() {
  console.log('src/index.ts: Application starting...');
  
  const greeting = createGreeting('Developer');
  console.log('src/index.ts: Greeting created:', greeting);
  
  // Example error handling
  try {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('src/index.ts: Application running successfully!');
  } catch (error) {
    console.error('src/index.ts: An error occurred:', error);
    process.exit(1);
  }
}

// Run the application
main().catch(error => {
  console.error('src/index.ts: Unhandled error:', error);
  process.exit(1);
}); 