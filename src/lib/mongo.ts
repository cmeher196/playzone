import { promises as fs } from "node:fs";
import path from "node:path";
import { MongoClient, type Collection, type Document } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB ?? "cricarena";

declare global {
  var __cricarenaMongoClient: MongoClient | undefined;
  var __cricarenaMongoConnect: Promise<MongoClient> | undefined;
}

async function getCollection(name: string): Promise<Collection<Document>> {
  if (!mongoUri) throw new Error("MONGODB_URI is not configured");
  const client = globalThis.__cricarenaMongoClient ?? new MongoClient(mongoUri);
  globalThis.__cricarenaMongoClient = client;
  globalThis.__cricarenaMongoConnect ??= client.connect().catch((error) => {
    globalThis.__cricarenaMongoConnect = undefined;
    throw error;
  });
  await globalThis.__cricarenaMongoConnect;
  return client.db(databaseName).collection(name);
}

export async function readStoredArray<T>(
  collectionName: string,
  fileName: string,
): Promise<T[]> {
  if (mongoUri) {
    const collection = await getCollection(collectionName);
    return (await collection.find({}, { projection: { _id: 0 } }).toArray()) as T[];
  }

  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", fileName), "utf8")) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readStoredItem<T>(
  collectionName: string,
  fileName: string,
  id: string,
): Promise<T | undefined> {
  if (mongoUri) {
    const collection = await getCollection(collectionName);
    const item = await collection.findOne({ id }, { projection: { _id: 0 } });
    return (item ?? undefined) as T | undefined;
  }

  const items = await readStoredArray<T & { id?: string }>(collectionName, fileName);
  return items.find((item) => item.id === id);
}

export async function replaceStoredItemAtRevision<T extends { id: string; revision?: number }>(
  collectionName: string,
  fileName: string,
  item: T,
  expectedRevision: number,
): Promise<boolean> {
  if (mongoUri) {
    const collection = await getCollection(collectionName);
    const revisionFilter = expectedRevision === 0
      ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
      : { revision: expectedRevision };
    const result = await collection.replaceOne(
      { id: item.id, ...revisionFilter },
      item as unknown as Document,
    );
    return result.matchedCount === 1;
  }

  const items = await readStoredArray<T & { id?: string }>(collectionName, fileName);
  const index = items.findIndex((stored) => stored.id === item.id);
  if (index === -1 || (items[index].revision ?? 0) !== expectedRevision) return false;
  items[index] = item;
  await writeStoredArray(collectionName, fileName, items);
  return true;
}

export async function writeStoredArray<T>(
  collectionName: string,
  fileName: string,
  items: T[],
): Promise<void> {
  if (mongoUri) {
    const collection = await getCollection(collectionName);
    const recordsWithIds = items.filter(
      (item): item is T & Document & { id: string } =>
        typeof item === "object" && item !== null && "id" in item && typeof item.id === "string",
    );
    if (recordsWithIds.length === items.length) {
      const ids = recordsWithIds.map((item) => item.id);
      await collection.deleteMany({ id: { $nin: ids } });
      for (const item of recordsWithIds) {
        try {
          await collection.replaceOne({ id: item.id }, item, { upsert: true });
        } catch (error) {
          if ((error as { code?: number }).code !== 11000) throw error;
          await collection.replaceOne({ id: item.id }, item);
        }
      }
    } else {
      await collection.deleteMany({});
      if (items.length > 0) await collection.insertMany(items as Document[]);
    }
    return;
  }

  const file = path.join(process.cwd(), "data", fileName);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}