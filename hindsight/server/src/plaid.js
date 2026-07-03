import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export const DEMO_MODE = process.env.DEMO_MODE !== "false";

let client = null;

export function plaidClient() {
  if (DEMO_MODE) return null;
  if (!client) {
    const env = process.env.PLAID_ENV || "sandbox";
    client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[env],
        baseOptions: {
          headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": process.env.PLAID_SECRET,
          },
        },
      })
    );
  }
  return client;
}
