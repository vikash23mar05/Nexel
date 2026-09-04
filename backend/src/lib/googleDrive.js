const crypto = require('crypto');
const { google } = require('googleapis');
const GoogleDriveConnection = require('../models/GoogleDriveConnection');
const fs = require('fs');

const algorithm = 'aes-256-gcm';
const encryptionKey = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'development-key').digest();

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

function decrypt(value) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI,
  );
}

function getAuthorizationUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [process.env.GOOGLE_DRIVE_SCOPES || 'https://www.googleapis.com/auth/drive.file'],
    state,
  });
}

async function saveConnection(ownerId, refreshToken) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: client });
  const folderResult = await drive.files.list({
    q: "name = 'Nexel' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id,name)',
    spaces: 'drive',
  });
  let folder = folderResult.data.files?.[0];
  if (!folder) {
    const created = await drive.files.create({
      requestBody: { name: 'Nexel', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id,name',
    });
    folder = created.data;
  }
  return GoogleDriveConnection.findOneAndUpdate(
    { owner: ownerId },
    { refreshToken: encrypt(refreshToken), folderId: folder.id },
    { upsert: true, new: true },
  );
}

async function getDriveForUser(ownerId) {
  const connection = await GoogleDriveConnection.findOne({ owner: ownerId });
  if (!connection) return null;
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: decrypt(connection.refreshToken) });
  return { drive: google.drive({ version: 'v3', auth: client }), connection };
}

async function uploadPdf(ownerId, filePath, name) {
  const connectionData = await getDriveForUser(ownerId);
  if (!connectionData) return null;
  const result = await connectionData.drive.files.create({
    requestBody: {
      name,
      parents: [connectionData.connection.folderId],
      mimeType: 'application/pdf',
    },
    media: { mimeType: 'application/pdf', body: fs.createReadStream(filePath) },
    fields: 'id,name,size,createdTime',
  });
  return result.data;
}

async function downloadPdf(ownerId, fileId, response) {
  const connectionData = await getDriveForUser(ownerId);
  if (!connectionData) return false;
  const result = await connectionData.drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );
  result.data.on('error', (error) => response.destroy(error));
  result.data.pipe(response);
  return true;
}

async function deletePdf(ownerId, fileId) {
  const connectionData = await getDriveForUser(ownerId);
  if (connectionData) await connectionData.drive.files.delete({ fileId });
}

module.exports = {
  createOAuthClient,
  decrypt,
  encrypt,
  getAuthorizationUrl,
  getDriveForUser,
  uploadPdf,
  downloadPdf,
  deletePdf,
  saveConnection,
};
