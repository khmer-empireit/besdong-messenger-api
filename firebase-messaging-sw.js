importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAqVNsQz4EhURTGCBkVtlMulCRrqa5TX50',
  authDomain: 'besdong-messenger-app.firebaseapp.com',
  projectId: 'besdong-messenger-app',
  storageBucket: 'besdong-messenger-app.firebasestorage.app',
  messagingSenderId: '123828249605',
  appId: '1:123828249605:web:d7d2635a38f1596a61686c',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = 'Besdong', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    tag: payload.data?.conversation_id ?? 'besdong',
    renotify: true,
    data: payload.data,
  });
});
