import fs from 'fs';
import path from 'path';
import { deleteTestUser } from './utils/testUserUtils';

async function globalTeardown() {
  const userPath = path.join(__dirname, 'global-user.json');

  if (fs.existsSync(userPath)) {
    try {
      const user = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
      console.log(`Teardown Global: Removendo usuário ${user.email}...`);
      await deleteTestUser(user.id);
      console.log('Teardown Global: Usuário removido.');
    } catch (error) {
      console.error('Teardown Global: Erro ao limpar usuário:', error);
    } finally {
      if (fs.existsSync(userPath)) {
        fs.unlinkSync(userPath);
      }
      // Opcional: limpar storageState também
      if (fs.existsSync('storageState.json')) {
        fs.unlinkSync('storageState.json');
      }
    }
  }
}

export default globalTeardown;
