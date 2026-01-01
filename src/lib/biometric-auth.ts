// src/lib/biometric-auth.ts

// Funções mock para simular interação com o backend
async function saveBiometricCredential(userId: string, credential: any) {
  console.log(`[MOCK] Salvando credencial biométrica para ${userId}`);
  // Aqui seria a chamada para o Supabase/Backend para salvar a credencial
  // Ex: await supabase.from('biometric_credentials').insert({ userId, credential });
  return true;
}

async function getBiometricCredentialId(userId: string): Promise<string | null> {
  console.log(`[MOCK] Buscando credencial biométrica para ${userId}`);
  // Aqui seria a chamada para o Supabase/Backend para buscar a credencial
  // Retorna um ID de credencial base64url-encoded
  return 'mock-credential-id-base64url'; 
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }
  
  try {
    // Verifica se o autenticador de plataforma está disponível e suporta verificação de usuário
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function registerBiometric(userId: string): Promise<boolean> {
  if (!await isBiometricAvailable()) {
    console.error('Biometria não disponível para registro.');
    return false;
  }
  
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Versix Norma',
          id: window.location.hostname
        },
        user: {
          id: Uint8Array.from(userId, c => c.charCodeAt(0)),
          name: userId,
          displayName: 'Usuário Versix Norma'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });
    
    if (credential) {
      // Salvar credencial no servidor
      await saveBiometricCredential(userId, credential);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao registrar biometria:', error);
    return false;
  }
}

export async function authenticateWithBiometric(userId: string): Promise<boolean> {
  if (!await isBiometricAvailable()) {
    console.error('Biometria não disponível para autenticação.');
    return false;
  }
  
  try {
    // Buscar credenciais do servidor
    const credentialIdBase64url = await getBiometricCredentialId(userId);
    
    if (!credentialIdBase64url) {
      console.log('Nenhuma credencial biométrica registrada para este usuário.');
      return false;
    }
    
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    // Converte base64url para ArrayBuffer
    const base64urlToBuffer = (base64url: string) => {
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const padded = pad ? base64 + '===='.substring(0, 4 - pad) : base64;
      return Uint8Array.from(atob(padded), c => c.charCodeAt(0)).buffer;
    };

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          type: 'public-key',
          id: base64urlToBuffer(credentialIdBase64url)
        }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    
    // Em um cenário real, o objeto 'assertion' seria enviado ao servidor para verificação
    return !!assertion;
  } catch (error) {
    console.error('Erro ao autenticar com biometria:', error);
    return false;
  }
}
