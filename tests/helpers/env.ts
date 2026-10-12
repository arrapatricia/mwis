function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env (local) or set it as a CI secret.`);
  }
  return value;
}

export const admin = {
  get email() {
    return required('MWIS_ADMIN_EMAIL');
  },
  get password() {
    return required('MWIS_ADMIN_PASSWORD');
  },
};

export const ADMIN_STATE = '.auth/admin.json';
