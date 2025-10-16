"use strict";

exports.up = function (db, callback) {
  db.runSql(
    `
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      description TEXT,
      createdAt DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql("DROP TABLE IF EXISTS roles;", callback);
};
