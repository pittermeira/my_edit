
import { users, sessions, type User, type InsertUser, type Session } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUser(username: string, password: string): Promise<User | null>;
  createSession(userId: number): Promise<string>;
  getSession(sessionId: string): Promise<{ user: User; session: Session } | null>;
  deleteSession(sessionId: string): Promise<void>;
  cleanExpiredSessions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.currentId = 1;
    
    // Clean expired sessions every hour
    setInterval(() => {
      this.cleanExpiredSessions();
    }, 60 * 60 * 1000);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByUsername(insertUser.username);
    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createSession(userId: number): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session: Session = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<{ user: User; session: Session } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    const user = await this.getUser(session.userId);
    if (!user) {
      this.sessions.delete(sessionId);
      return null;
    }

    return { user, session };
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const storage = new MemStorage();
