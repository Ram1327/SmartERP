import dotenv from 'dotenv';
import app from './app.js';
import prisma from './config/db.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database.');

    // Start listening
    app.listen(PORT, () => {
      console.log(`SmartERP backend server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
