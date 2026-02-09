import 'dotenv/config';

const run = async () => {
  await import('./seed.js');
};

run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
