'use server';

import { z } from 'zod';
import { signIn } from './auth';
import { getUser, createUser } from '@/lib/users';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export interface RegisterActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_exists';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const result = await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false, // Keep client-side control
    });

    if (result?.error) {
      return { status: 'failed' };
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const existingUser = await getUser(validatedData.email);
    if (existingUser !== null) {
      return { status: 'user_exists' };
    }

    await createUser(validatedData.email, validatedData.password);
    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
