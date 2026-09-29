import { initSchema, db } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

initSchema();

// Автоматично зареждане на примерни данни при първо стартиране
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  console.log('▸ Празна база – зареждам примерни данни...');
  seed();
}

createApp().listen(PORT, () => {
  console.log(`\n  ✔ Сървърът на „300 Триста – Обучения" работи на http://localhost:${PORT}\n`);
});
