import 'dotenv/config';

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, (error?: Error) => {
  if (error) {
    logger.error(error, `Could not start on port ${PORT}`);
    process.exit(1);
  }
  logger.info(`ShelfSnap Groq API listening on http://localhost:${PORT}`);
});
