"use strict";

exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE contests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 description TEXT,
 accessLevel ENUM('vip','normal') DEFAULT 'normal',
 startAt DATETIME NOT NULL,
 endAt DATETIME NOT NULL,
 prizeTitle VARCHAR(255),
 prizeDescription TEXT,
 prizeQuantity INT DEFAULT 1,
 isFinalized INT DEFAULT 0,
 createdBy INT,
 createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
 );
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql("DROP TABLE IF EXISTS contests;", callback);
};
