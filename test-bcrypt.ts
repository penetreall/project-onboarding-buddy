import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const password = "solitude";
const existingHash = "$2a$06$Z5JErcjvgHBv9EL0V0esf.PHvxjHqOe4CVYKNuXeiUp0R5zVE4bKe";

console.log("Testing bcrypt...");
console.log("Password:", password);
console.log("Existing hash:", existingHash);

const valid = await bcrypt.compare(password, existingHash);
console.log("Is valid?", valid);

const newHash = await bcrypt.hash(password);
console.log("New hash:", newHash);

const validNew = await bcrypt.compare(password, newHash);
console.log("New hash valid?", validNew);
