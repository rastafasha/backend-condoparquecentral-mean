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


// Agregamos 'url' como cuarto parámetro (opcional, por defecto '/home')
const sendNotification = async (userSubscription, title, message) => {
  const payload = JSON.stringify({
    notification: {
      title,
      body: message,
      icon: 'https://propietarios-corpocapital-pc.vercel.app/assets/icons/icon-128x128.png', // URL ABSOLUTA obligatoria
      vibrate: [100, 50, 100],
      data: { url }
    }
  });

  try {
    await webpush.sendNotification(userSubscription, payload);
  } catch (error) {
    // Si el navegador responde 410 o 404, la suscripción ya no es válida
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('Suscripción expirada. Deberías marcarla como null en tu DB.');
      // Opcional: Aquí podrías pasar el ID del usuario para poner pushSubscription: null
    }
  }
};

module.exports = {
    sendNotification
};