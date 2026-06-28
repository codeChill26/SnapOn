const https = require('https');

/**
 * Sends push notifications to Expo Push service
 * @param {string|string[]} tokens - Expo Push Token(s)
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {object} data - Custom payload data
 */
async function sendExpoPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return null;

  const pushTokens = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => t.startsWith('ExponentPushToken') || t.startsWith('host.exp.exponent'));
  if (pushTokens.length === 0) return null;

  const messages = pushTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const postData = JSON.stringify(messages);

  const options = {
    hostname: 'exp.host',
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve(parsed);
        } catch (e) {
          resolve(responseBody);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Expo push notification error:', err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { sendExpoPushNotification };
