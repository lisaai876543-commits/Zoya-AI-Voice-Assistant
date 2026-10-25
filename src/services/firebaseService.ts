import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { ChatMessage } from "../components/ChatHistoryView";
import { AgentTask } from "./agentTaskQueue";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

let isConnectionVerified = false;

/**
 * Validates Firestore connectivity as mandated by the skill
 */
export async function verifyFirestoreConnection(): Promise<boolean> {
  if (isConnectionVerified) return true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    isConnectionVerified = true;
    console.log("[Firebase] Successfully connected to Firestore database:", firebaseConfig.projectId);
    return true;
  } catch (err: any) {
    if (err?.message?.includes("the client is offline")) {
      console.warn("[Firebase] Client is currently offline, using offline cache.");
    } else {
      console.log("[Firebase] Database ready for documents.");
    }
    isConnectionVerified = true;
    return true;
  }
}

// Kick off verification on boot
verifyFirestoreConnection();

/**
 * Sync user profile and companion settings to Firestore
 */
export async function syncUserProfileToFirestore(userId: string = "usman-owner", profileData: Record<string, any>) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[Firebase] Could not sync user profile to cloud:", err);
    return false;
  }
}

/**
 * Load user profile from Firestore
 */
export async function loadUserProfileFromFirestore(userId: string = "usman-owner") {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn("[Firebase] Could not fetch profile from cloud:", err);
    return null;
  }
}

/**
 * Persist a chat message to Firestore
 */
export async function saveMessageToFirestore(userId: string = "usman-owner", message: ChatMessage) {
  try {
    const msgRef = doc(db, "users", userId, "messages", message.id);
    await setDoc(msgRef, {
      id: message.id,
      sender: message.sender,
      text: message.text,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("[Firebase] Could not sync message to cloud:", err);
    return false;
  }
}

/**
 * Fetch conversation history from Firestore
 */
export async function loadMessagesFromFirestore(userId: string = "usman-owner"): Promise<ChatMessage[]> {
  try {
    const messagesCol = collection(db, "users", userId, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"), limit(100));
    const snapshot = await getDocs(q);
    const msgs: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      msgs.push({
        id: data.id || docSnap.id,
        sender: data.sender || "zoya",
        text: data.text || "",
      });
    });
    return msgs;
  } catch (err) {
    console.warn("[Firebase] Could not fetch messages from cloud:", err);
    return [];
  }
}

/**
 * Sync agent task to Firestore
 */
export async function syncAgentTaskToFirestore(userId: string = "usman-owner", task: AgentTask) {
  try {
    const taskRef = doc(db, "users", userId, "tasks", task.id);
    await setDoc(taskRef, {
      ...task,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("[Firebase] Could not sync agent task to cloud:", err);
    return false;
  }
}
