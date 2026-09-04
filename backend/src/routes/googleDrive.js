const express = require('express');
const router = express.Router();
const { signToken, verifyToken } = require('../config/jwt');
const auth = require('../middleware/auth');
const GoogleDriveConnection = require('../models/GoogleDriveConnection');
const {
  createOAuthClient,
  getAuthorizationUrl,
  saveConnection,
} = require('../lib/googleDrive');

router.get('/status', auth, async (req, res, next) => {
  try {
    const connection = await GoogleDriveConnection.findOne({ owner: req.user.id }).select('_id folderId updatedAt');
    res.json({ connected: Boolean(connection), connectedAt: connection?.updatedAt || null });
  } catch (error) {
    next(error);
  }
});

router.get('/connect', auth, (req, res) => {
  const state = signToken({ userId: req.user.id, purpose: 'google-drive-connect' }, { expiresIn: '10m' });
  res.json({ url: getAuthorizationUrl(state) });
});

router.get('/callback', async (req, res) => {
  const redirect = process.env.CLIENT_URL || 'http://localhost:3000';
  try {
    const { code, state } = req.query;
    const statePayload = state && verifyToken(state);
    if (!code || !statePayload || statePayload.purpose !== 'google-drive-connect') {
      return res.redirect(`${redirect}/storage?drive=error`);
    }

    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return res.redirect(`${redirect}/storage?drive=reauthorize`);
    }
    await saveConnection(statePayload.userId, tokens.refresh_token);
    res.redirect(`${redirect}/storage?drive=connected`);
  } catch (error) {
    console.error('[Google Drive OAuth]', error.message);
    res.redirect(`${redirect}/storage?drive=error`);
  }
});

router.delete('/disconnect', auth, async (req, res, next) => {
  try {
    await GoogleDriveConnection.deleteOne({ owner: req.user.id });
    res.json({ connected: false });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
