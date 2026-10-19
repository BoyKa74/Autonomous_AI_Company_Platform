export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường ${name}. Hãy copy .env.example thành .env.local và điền giá trị.`
    );
  }
  return value;
}
