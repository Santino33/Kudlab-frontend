import { validNewPassword } from '../types.ts';

export function recoveryPasswordIssues(password: string, confirmation: string): { password?: string; confirmation?: string } {
  return {
    ...(!validNewPassword(password) ? { password: 'Usa de 8 a 128 caracteres con una mayúscula (A–Z), una minúscula (a–z) y un número.' } : {}),
    ...(!confirmation ? { confirmation: 'Vuelve a escribir tu nueva contraseña.' } :
      password !== confirmation ? { confirmation: 'Las contraseñas deben coincidir.' } : {}),
  };
}
