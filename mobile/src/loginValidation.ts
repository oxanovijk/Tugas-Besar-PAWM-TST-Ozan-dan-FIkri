type LoginErrors = { email?: string; password?: string };

export function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const address = email.trim();

  if (!address) {
    errors.email = 'Masukkan email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    errors.email = 'Masukkan alamat email yang valid.';
  }

  if (!password.trim()) {
    errors.password = 'Masukkan kata sandi.';
  }

  return errors;
}
