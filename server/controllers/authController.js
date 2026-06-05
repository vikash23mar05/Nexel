import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide username, email, and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const googleLogin = async (req, res) => {
  const { token } = req.body; 

  if (!token) {
    return res.status(400).json({ error: 'Google ID token is required' });
  }

  try {
    let email, name, googleId;

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'google-client-id-placeholder') {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name || payload.given_name || 'Google User';
      googleId = payload.sub; 
    } else {

      console.warn('⚠️ Google Client ID is not configured. Falling back to unsafe payload decoding for development.');
      const parts = token.split('.');
      if (parts.length !== 3) {
        return res.status(400).json({ error: 'Invalid JWT structure' });
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      email = payload.email;
      name = payload.name || 'Google User';
      googleId = payload.sub || payload.googleId;
    }

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Invalid token payload details' });
    }

    let user = await User.findOne({ googleId });

    if (!user) {

      user = await User.findOne({ email });

      if (user) {

        user.googleId = googleId;
        await user.save();
      } else {

        user = await User.create({
          username: name,
          email,
          googleId,
        });
      }
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Google token authentication failed' });
  }
};