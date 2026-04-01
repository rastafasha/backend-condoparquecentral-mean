require('dotenv').config(); 
const webpush = require('web-push');

// 1. Configuración (Asegúrate de que estas variables existan en el .env)
webpush.setVapidDetails(
  'mailto:tu-email@ejemplo.com',
  process.env.VAPI_KEY_PUBLIC,
  process.env.VAPI_KEY_PRIVATE
);

// 2. CONFIGURACIÓN DE LA SUSCRIPCIÓN (Copia los valores de tu DB)
// IMPORTANTE: El endpoint debe ser la URL completa
const pushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/dlYofMxsqk4:APA91bEQwGfu5dyT8GKPQJcJktiDUaJfDyMvaXHDZHgUQ-ugVV4g1dHQ0eGOHdpIi4SRtyJ0cCvVxHZ_2ehGT4Dt457tPoaxxI9ZzyWPwJQYl_3o_-C_ZVzYGUDaYyjqgxxpXwv3skuY', // URL completa
  keys: {
    p256dh: 'BC4PVcKy9TENUuZBZaIJAntv3koCTim_XO0pqlxP5pIzL9sU2CsoAmCNeWZJGsp3BGbUyLrZkFUSdZzU0lIkegs',
    auth: '1q1jCJ80TD6gNXtZs5QOqQ'
  }
};

// 3. PAYLOAD (El formato de Angular es estricto)
const payload = JSON.stringify({
  notification: {
    title: '¡Prueba Directa!',
    body: 'Si ves esto, la conexión es correcta.',
    icon: 'https://flaticon.com',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [{
      action: 'explore',
      title: 'Ver ahora'
    }]
  }
});

// 4. ENVÍO CON CAPTURA DE ERROR COMPLETA
console.log('--- Iniciando envío ---');

webpush.sendNotification(pushSubscription, payload)
  .then(response => {
    console.log('✅ ÉXITO: Notificación enviada.');
    console.log('Status:', response.statusCode);
  })
  .catch(error => {
    console.error('❌ ERROR DETECTADO:');
    // Esto nos dirá si el error es de la librería o de la red
    console.error('Mensaje de error:', error.message);
    if (error.statusCode) {
      console.error('Código de estado HTTP:', error.statusCode);
      console.error('Cuerpo del error del navegador:', error.body);
    } else {
      console.error('El error no tiene status code. Posible problema de formato en la suscripción o conexión de red.');
    }
  });
