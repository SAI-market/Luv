/* =============================================
   LUV. — CONFIG DE FIREBASE (proyecto: luv-liga-unlu-voley)
   La apiKey es pública por diseño: la seguridad la dan las
   reglas de Firestore (ver firestore.rules), no esconder esto.
============================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDuoPrXtEbsYfFsgwCYNtj6Cn9d6Rd-Rfs",
  authDomain: "luv-liga-unlu-voley.firebaseapp.com",
  projectId: "luv-liga-unlu-voley",
  storageBucket: "luv-liga-unlu-voley.firebasestorage.app",
  messagingSenderId: "242930266318",
  appId: "1:242930266318:web:1960c59dbbe1f9f65b609f"
};

firebase.initializeApp(firebaseConfig);
