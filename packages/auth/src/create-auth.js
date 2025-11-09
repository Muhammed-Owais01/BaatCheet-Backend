import { OpenFgaClient } from "@openfga/sdk";
import fs from "fs";
import env from "@baatcheet/env";

async function createAuthModel() {
  const client = new OpenFgaClient({
    apiUrl: env.FGA_API_URL,
    storeId: env.FGA_STORE_ID,
  });

  const model = JSON.parse(fs.readFileSync("./model.json", "utf-8"));

  const response = await client.writeAuthorizationModel(model);
  console.log("Auth model created:", response);
}

createAuthModel();