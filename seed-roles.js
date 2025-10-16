const pool = require("./db");

async function seedRoles() {
  try {
    const roles = [
      { name: "Admin", description: "Full access to all system features" },
      { name: "VIP", description: "Access to VIP contests and special features" },
      { name: "User", description: "Regular user access" },
       { name: "Guest", description: "Can view contests only" },

    ];

    for (const role of roles) {
      const [rows] = await pool.execute("SELECT * FROM roles WHERE name = ?", [role.name]);
      if (rows.length === 0) {
        await pool.execute(
          "INSERT INTO roles (name, description) VALUES (?, ?)",
          [role.name, role.description]
        );
        console.log(`Inserted role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    console.log("Role seeding complete!");
  } catch (err) {
    console.error("Error seeding roles:", err);
  } finally {
    await pool.end();
  }
}

seedRoles();
