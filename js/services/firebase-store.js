import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";

import { db } from "../firebase.js";

const COLLECTION_NAMES = ["tasks", "events", "links", "notes"];
const MAX_BATCH_OPERATIONS = 400;

function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanValue(item)])
    );
  }

  return value;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, stableValue(value[key])])
    );
  }

  return value;
}

function serialize(value) {
  return JSON.stringify(stableValue(cleanValue(value)));
}

function firestoreDocumentId(id) {
  return encodeURIComponent(String(id));
}

async function commitOperations(operations) {
  for (let index = 0; index < operations.length; index += MAX_BATCH_OPERATIONS) {
    const batch = writeBatch(db);

    operations.slice(index, index + MAX_BATCH_OPERATIONS).forEach(operation => {
      if (operation.type === "delete") batch.delete(operation.ref);
      else batch.set(operation.ref, operation.data);
    });

    await batch.commit();
  }
}

export function createFirebaseStore(uid) {
  if (!uid) throw new Error("Mangler bruker-ID for Firestore.");

  const collectionCaches = new Map();

  function userCollection(name) {
    if (!COLLECTION_NAMES.includes(name)) throw new Error(`Ukjent samling: ${name}`);
    return collection(db, "users", uid, name);
  }

  function metaDocument(name) {
    return doc(db, "users", uid, "meta", name);
  }

  async function readCollection(name) {
    const snapshot = await getDocs(userCollection(name));
    const cache = new Map();

    const items = snapshot.docs.map(documentSnapshot => {
      const data = cleanValue(documentSnapshot.data());
      const id = data.id || decodeURIComponent(documentSnapshot.id);
      const item = { ...data, id };

      cache.set(documentSnapshot.id, serialize(item));
      return item;
    });

    collectionCaches.set(name, cache);
    return items;
  }

  async function syncCollection(name, items) {
    if (!Array.isArray(items)) throw new Error(`${name} må være en liste.`);
    if (!collectionCaches.has(name)) await readCollection(name);

    const previous = collectionCaches.get(name) || new Map();
    const desired = new Map();
    const operations = [];

    items.forEach(item => {
      if (!item?.id) throw new Error(`Et element i ${name} mangler id.`);

      const data = cleanValue({ ...item, id: String(item.id) });
      const documentId = firestoreDocumentId(data.id);
      const serialized = serialize(data);

      desired.set(documentId, serialized);

      if (previous.get(documentId) !== serialized) {
        operations.push({
          type: "set",
          ref: doc(userCollection(name), documentId),
          data
        });
      }
    });

    previous.forEach((_, documentId) => {
      if (!desired.has(documentId)) {
        operations.push({
          type: "delete",
          ref: doc(userCollection(name), documentId)
        });
      }
    });

    if (operations.length) await commitOperations(operations);
    collectionCaches.set(name, desired);
  }

  return {
    provider: "firebase",
    uid,

    getTasks() {
      return readCollection("tasks");
    },
    saveTasks(tasks) {
      return syncCollection("tasks", tasks);
    },

    getEvents() {
      return readCollection("events");
    },
    saveEvents(events) {
      return syncCollection("events", events);
    },

    getLinks() {
      return readCollection("links");
    },
    saveLinks(links) {
      return syncCollection("links", links);
    },

    getNotes() {
      return readCollection("notes");
    },
    saveNotes(notes) {
      return syncCollection("notes", notes);
    },

    async getSettings() {
      const snapshot = await getDoc(metaDocument("settings"));
      if (!snapshot.exists()) return {};

      const value = snapshot.data()?.value;
      return value && typeof value === "object" && !Array.isArray(value)
        ? cleanValue(value)
        : {};
    },

    async saveSettings(settings) {
      await setDoc(metaDocument("settings"), {
        value: cleanValue(settings),
        updatedAt: serverTimestamp()
      }, { merge: true });
    },

    async getMigrationState() {
      const snapshot = await getDoc(metaDocument("migration"));
      return snapshot.exists() ? snapshot.data() : null;
    },

    async markLocalMigrationReviewed({ imported, reason }) {
      await setDoc(metaDocument("migration"), {
        version: 1,
        imported: Boolean(imported),
        reason: String(reason || ""),
        reviewedAt: serverTimestamp()
      }, { merge: true });
    }
  };
}
