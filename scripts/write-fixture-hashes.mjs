import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const fixturesPath = path.join(process.cwd(), "data", "fixtures", "usuarios.json");
const users = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

for (const user of users) {
  if (user.plainPassword) {
    user.passwordHash = await bcrypt.hash(user.plainPassword, 10);
    delete user.plainPassword;
  }
}

fs.writeFileSync(fixturesPath, JSON.stringify(users, null, 2) + "\n");
console.log("Updated password hashes in usuarios.json");
