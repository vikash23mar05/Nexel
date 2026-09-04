// src/middleware/auth.js
const { verifyToken } = require('../config/jwt');
const { verifyToken: verifyClerkToken, createClerkClient } = require('@clerk/backend');
const User = require('../models/User');

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

async function verifyIdentity(token) {
  const legacyPayload = verifyToken(token);
  if (legacyPayload) return legacyPayload;

  if (!clerkClient) return null;

  try {
    const clerkPayload = await verifyClerkToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (!clerkPayload?.sub) return null;

    const clerkUser = await clerkClient.users.getUser(clerkPayload.sub);
    const email = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;
    if (!email) return null;

    let user = await User.findOne({ clerkId: clerkPayload.sub });
    if (!user) {
      user = await User.findOne({ email });
    }
    if (!user) {
      user = await User.create({ email, clerkId: clerkPayload.sub });
    } else if (user.clerkId !== clerkPayload.sub) {
      user.clerkId = clerkPayload.sub;
      await user.save();
    }

    return { id: user._id.toString(), email: user.email, role: user.role };
  } catch (error) {
    return null;
  }
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing Authentication' });
  }

  const payload = await verifyIdentity(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = payload; // attach user info to request
  next();
};

module.exports.verifyIdentity = verifyIdentity;
