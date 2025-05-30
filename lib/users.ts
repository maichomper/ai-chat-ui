import { hash, compare } from 'bcrypt-ts';

// Using simple type since we're not using DB
interface User {
  id: string;
  email: string;
  password: string;
}

// In-memory storage
const users: User[] = [];

export async function getUser(email: string): Promise<User | null> {
  return users.find(user => user.email === email) || null;
}

export async function createUser(email: string, password: string): Promise<User> {
  const hashedPassword = await hash(password, 10);
  const user: User = {
    id: Math.random().toString(),
    email,
    password: hashedPassword
  };
  users.push(user);
  return user;
}

export async function validateUser(email: string, password: string): Promise<boolean> {
  const user = await getUser(email);
  if (!user) return false;
  return compare(password, user.password);
} 