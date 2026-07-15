import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const generate = customAlphabet(alphabet, 21);

export function generateSlug(): string {
  return generate();
}
