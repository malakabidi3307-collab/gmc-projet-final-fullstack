import { stdin, stdout } from "node:process";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { createUser } from "../services/users.service.js";
import { createUserSchema } from "../validators/users.validators.js";

/** Lit une ligne au clavier. Avec hidden = true, rien n'est affiche (mot de passe). */
function ask(prompt: string, hidden: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error("Un terminal interactif est requis."));
      return;
    }
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          finish();
          reject(new Error("Operation annulee."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            if (!hidden) stdout.write("\b \b");
          }
          continue;
        }
        value += ch;
        if (!hidden) stdout.write(ch);
      }
    };
    stdin.on("data", onData);
  });
}

function databaseName(): string {
  try {
    return new URL(env.DATABASE_URL).pathname.slice(1) || "?";
  } catch {
    return "?";
  }
}

async function main(): Promise<void> {
  console.log(`Creation d'un administrateur dans la base : ${databaseName()}`);
  const name = (await ask("Nom complet : ", false)).trim();
  const email = (await ask("Adresse e-mail : ", false)).trim();
  const password = await ask("Mot de passe (12 caracteres minimum, saisie masquee) : ", true);
  const confirmation = await ask("Confirmez le mot de passe : ", true);
  if (password !== confirmation) {
    throw new AppError(400, "PASSWORD_MISMATCH", "Les mots de passe ne correspondent pas.");
  }
  const input = createUserSchema.parse({ name, email, role: "ADMIN", password });
  const user = await createUser(input);
  console.log(`Administrateur cree : ${user.email} (id ${user.id})`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof ZodError) {
      for (const issue of error.issues) {
        console.error(`- ${issue.path.join(".") || "valeur"} : ${issue.message}`);
      }
    } else if (error instanceof AppError || error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("Erreur inattendue.");
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());