import { promises as fs } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB ?? "cricarena";

if (!uri) {
  throw new Error("Set MONGODB_URI before running this migration.");
}

const stores = [
  ["registrations", "registrations.json"],
  ["tournaments", "tournaments.json"],
  ["teams", "teams.json"],
  ["liveMatches", "live-matches.json"],
  ["badminton", "badminton.json"],
  ["badmintonTournaments", "badminton-tournaments.json"],
];

const client = new MongoClient(uri);
const dataDir = path.join(process.cwd(), "data");

try {
  await client.connect();
  const database = client.db(databaseName);

  for (const [collectionName, fileName] of stores) {
    const file = path.join(dataDir, fileName);
    let items;
    try {
      items = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }

    if (!Array.isArray(items)) throw new Error(`${fileName} must contain an array`);
    const collection = database.collection(collectionName);
    let imported = 0;
    for (const item of items) {
      if (item.id) {
        await collection.replaceOne({ id: item.id }, item, { upsert: true });
      } else {
        await collection.insertOne(item);
      }
      imported += 1;
    }
    if (items.some((item) => item.id)) await collection.createIndex({ id: 1 }, { unique: true });
    console.log(`${collectionName}: imported ${imported} record(s)`);
  }
} finally {
  await client.close();
}