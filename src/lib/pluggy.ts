import { PluggyClient } from "pluggy-sdk";

const globalForPluggy = globalThis as unknown as {
  pluggyClient: PluggyClient | undefined;
};

function createPluggyClient(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET devem estar configurados no .env"
    );
  }

  return new PluggyClient({ clientId, clientSecret });
}

export function getPluggyClient(): PluggyClient {
  const client = globalForPluggy.pluggyClient ?? createPluggyClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPluggy.pluggyClient = client;
  }

  return client;
}
