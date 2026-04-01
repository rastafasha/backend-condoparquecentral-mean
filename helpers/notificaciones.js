const webpush = require('web-push');

 const vapidKeys = {
    "publicKey": process.env.VAPI_KEY_PUBLIC || '',
    "privateKey": process.env.VAPI_KEY_PRIVATE || ''
  };

  webpush.setVapidDetails(
    'mailto:mercadocreativo@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );

const sendNotification = async (userSubscription, title, message) => {
  const payload = JSON.stringify({
    notification: {
      title: title,
      body: message,
      icon: 'https://propietarios-corpocapital-pc.vercel.app/assets/icons/icon-128x128.png',
      vibrate: [100, 50, 100],
      data: { url: '/my-account' }
    }
  });

  try {
    await webpush.sendNotification(userSubscription, payload);
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Suscripción expirada, eliminando de la DB...');
      // AQUÍ: Borra la suscripción de tu base de datos
    }
  }
};

module.exports = {
    sendNotification
};