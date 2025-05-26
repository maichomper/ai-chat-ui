import { hash, compare } from 'bcrypt-ts';

interface User {
  id: string;
  email: string;
  password: string;
}

// In-memory user store
const users: User[] = [];

export async function getUser(email: string): Promise<User[]> {
  return users.filter(user => user.email === email);
}

export async function createUser(email: string, password: string): Promise<User> {
  const hashedPassword = await hash(password, 10);
  const newUser: User = {
    id: Math.random().toString(36).substring(7),
    email,
    password: hashedPassword
  };
  users.push(newUser);
  return newUser;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
} 