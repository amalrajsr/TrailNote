import "./load-env";
import { z } from "zod";
import { getDatabase } from "../src/db";
import { imageKitProvider } from "../src/server/services/uploads";
import { deleteAccount } from "../src/server/services/accounts";

async function main() {
  const userId = z.uuid().parse(process.argv[2]);
  const { db, client } = await getDatabase();
  try {
    const provider = imageKitProvider();
    const result = await deleteAccount(db, userId, async (asset) => {
      if (asset.fileId) await provider.delete(asset.fileId);
      if (asset.path) await provider.purge(asset.path);
    });
    console.info(
      `Erased account ${userId}: ${result.deletedContributions} contributions and ${result.deletedAssets} media assets.`,
    );
  } finally {
    client.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Account deletion failed.",
  );
  process.exitCode = 1;
});
