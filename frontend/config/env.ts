import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_PROJECT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_PROJECT_ID is required'),
  NEXT_PUBLIC_PAYMASTER_ADDRESS: z
    .string()
    .min(1, 'NEXT_PUBLIC_PAYMASTER_ADDRESS is required'),
});

const parsedEnv = envSchema.parse({
  NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
  NEXT_PUBLIC_PAYMASTER_ADDRESS: process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS,
});

export const env = {
  projectId: parsedEnv.NEXT_PUBLIC_PROJECT_ID,
  paymasterAddress: parsedEnv.NEXT_PUBLIC_PAYMASTER_ADDRESS,
} as const;
