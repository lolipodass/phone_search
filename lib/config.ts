/**
 * The hidden secret area is unlocked by typing a 4-digit code that starts with 9.
 * Override with NEXT_PUBLIC_SECRET_CODE at build time if you want a different code.
 * There is deliberately no UI anywhere that reveals this feature.
 */
export const SECRET_CODE = process.env.NEXT_PUBLIC_SECRET_CODE || '9241';
