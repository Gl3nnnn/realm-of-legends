import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { MAX_CHARACTERS } from "@realm/core";
import type { CharacterSave } from "@realm/core";

interface RealmDB extends DBSchema {
  characters: {
    key: string;
    value: CharacterSave;
    indexes: { "by-updated": number };
  };
}

const DB_NAME = "realm-of-legends";
const DB_VERSION = 1;

export class SaveRepository {
  private dbPromise: Promise<IDBPDatabase<RealmDB>> | null = null;

  private db(): Promise<IDBPDatabase<RealmDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<RealmDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const store = db.createObjectStore("characters", { keyPath: "id" });
          store.createIndex("by-updated", "updatedAt");
        },
      });
    }
    return this.dbPromise;
  }

  async list(): Promise<CharacterSave[]> {
    const db = await this.db();
    const saves = await db.getAll("characters");
    return saves.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<CharacterSave | undefined> {
    const db = await this.db();
    return db.get("characters", id);
  }

  async count(): Promise<number> {
    const db = await this.db();
    return db.count("characters");
  }

  async put(save: CharacterSave): Promise<void> {
    const db = await this.db();
    const existing = await db.get("characters", save.id);
    if (!existing && (await db.count("characters")) >= MAX_CHARACTERS) {
      throw new Error(`You can only keep ${MAX_CHARACTERS} characters. Delete one first.`);
    }
    await db.put("characters", save);
  }

  async delete(id: string): Promise<void> {
    const db = await this.db();
    await db.delete("characters", id);
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await db.clear("characters");
  }
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("That file is not valid JSON."));
      }
    };
    reader.readAsText(file);
  });
}
