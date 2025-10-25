import { OpenFgaClient } from "@openfga/sdk";
import env from "@baatcheet/env";

export const fgaClient = new OpenFgaClient({
  storeId: env.FGA_STORE_ID,
  apiUrl: env.FGA_API_URL,
  authorizationModelId: env.FGA_AUTH_MODEL_ID
});
