/* =============================================
   LUV. — LOGIN DEL PANEL /admin
   La lectura pública del sitio vive en datos.js.
============================================= */

const auth = firebase.auth();

function traducirErrorAuth(code) {
  const mapa = {
    'auth/invalid-email': 'Email inválido.',
    'auth/user-not-found': 'No existe un usuario con ese email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos.',
  };
  return mapa[code] || 'No se pudo iniciar sesión.';
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    errorEl.textContent = traducirErrorAuth(err.code);
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  const loginView = document.getElementById('loginView');
  const panelView = document.getElementById('panelView');
  const userBox = document.getElementById('adminUserBox');

  if (!user) {
    loginView.style.display = '';
    panelView.style.display = 'none';
    userBox.style.display = 'none';
    return;
  }

  loginView.style.display = 'none';
  panelView.style.display = '';
  userBox.style.display = 'flex';
  document.getElementById('adminEmail').textContent = user.email;

  if (typeof initAdminPanel === 'function') initAdminPanel();
});
