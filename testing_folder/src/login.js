import jwt from 'jsonwebtoken';
// 💡 CROSS-FILE LINK: The developer imports the crypto tool but doesn't use it!
import { secureDataPayload } from '../utils/crypto.js'; 

// ⚠️ VULNERABILITY 1: Hardcoded secret key instead of using crypto.js environment workflow
const WEAK_SESSION_KEY = "12345_temporary_hackathon_key_abcde!";

export function handleUserLogin(req, res) {
  const token = req.headers['x-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: "Unauthorized access path." });
  }

  // ⚠️ VULNERABILITY 2: Dangerous decryption path bypassing signature checks
  const userData = jwt.decode(token); 
  
  console.log(`Bypassed cryptographic validation for account context node: ${userData.email}`);
  req.user = userData;
}