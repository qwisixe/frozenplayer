const { contextBridge } = require('electron');

// Безопасно выставляем необходимые переменные/методы в renderer
contextBridge.exposeInMainWorld('env', {
  // JAMENDO_CLIENT_ID можно задавать через переменные окружения при запуске
  JAMENDO_CLIENT_ID: process.env.JAMENDO_CLIENT_ID || ''
});
