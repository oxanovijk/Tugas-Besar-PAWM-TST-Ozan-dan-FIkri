type LoginErrors = { email?: string; password?: string };

export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const address = email.trim();

  if (!address) {
    errors.email = 'Masukkan email.';
  } else if (Array.from(address).length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    errors.email = 'Masukkan alamat email yang valid.';
  }

  if (!password) {
    errors.password = 'Masukkan kata sandi.';
  } else if (Array.from(password).length > 128) {
    errors.password = 'Kata sandi maksimal 128 karakter.';
  }

  return errors;
}
