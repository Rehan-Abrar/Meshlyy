import express from 'express';
import cors from 'cors';
import { validateEnv } from './config/env';
import { router } from './routes';
import { requestTimeout } from './middleware/timeout';

const env = validateEnv();
const app = express();

app.use(cors());
app.use(express.json());
app.use(requestTimeout(5000));

app.use(router);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Meshly backend listening on port ${env.port}`);
});
