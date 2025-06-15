const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

// Database path - adjust this if your database is in a different location
const dbPath = path.join(__dirname, '../data/grupos.db');
const db = new sqlite3.Database(dbPath);

// Admin user details - you can customize these
const adminUser = {
  nombre: 'Admin',
  primer_apellido: 'User',
  email: 'franzz2000@mail.com',
  password: 'admin123', // Change this to a secure password
  es_admin: 1, // 1 for admin, 0 for regular user
  puesto_trabajo: 'Administrador',
  activo: 0 // 1 for active, 0 for inactive
};

exports.createAdminUser = (callback) => {
  // Hash the password
  bcrypt.hash(adminUser.password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }

    // Check if users table exists, if not create it
    db.serialize(() => {
      // Check if admin user already exists
      db.get('SELECT * FROM personas WHERE email = ?', [adminUser.email], (err, row) => {
        if (err) {
          console.error('Error checking for existing admin:', err);
          db.close();
          return;
        }

        if (row) {
          console.log('Admin user already exists. Updating password...');
          // Update existing admin user
          db.run(
            'UPDATE personas SET nombre = ?, primer_apellido = ?, password = ?, es_admin = ?, updated_at = CURRENT_TIMESTAMP, puesto_trabajo = ?, activo = ? WHERE email = ?',
            [adminUser.nombre, adminUser.primer_apellido, hashedPassword, adminUser.es_admin, adminUser.puesto_trabajo, adminUser.activo, adminUser.email],
            function (err) {
              if (err) {
                console.error('Error updating admin user:', err);
              } else {
                console.log(`Admin user updated successfully with ID: ${this.lastID}`);
                console.log(`Email: ${adminUser.email}`);
                console.log('Password: [the password you provided]');
              }
              db.close();
            }
          );
        } else {
          // Insert new admin user
          db.run(
            'INSERT INTO personas (nombre, primer_apellido, email, password, es_admin) VALUES (?, ?, ?, ?, ?)',
            [adminUser.nombre, adminUser.primer_apellido, adminUser.email, hashedPassword, adminUser.es_admin],
            function (err) {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log(`Admin user created successfully with ID: ${this.lastID}`);
                console.log(`Email: ${adminUser.email}`);
                console.log('Password: [the password you provided]');
              }
              db.close();
            }
          );
        }
        // Ignorar el error si la columna ya existe
        callback();
      });
    });
  });
}
