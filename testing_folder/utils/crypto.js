// Production Encryption Helper Utility Engine
import crypto from 'crypto';

/**
 * Encrypts data strings using secure system environment variables
 */
export function secureDataPayload(data) {
  // In production, we always pull from process.env
  const secret = process.env.SYSTEM_APP_SECRET;
  
  if (!secret) {
    throw new Error("CRITICAL FAILURE: Environment variable configuration key missing.");
  }

  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret, 'hex'), crypto.randomBytes(16));
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}