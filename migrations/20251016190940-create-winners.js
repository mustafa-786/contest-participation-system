"use strict";

exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE winners (
 id INT AUTO_INCREMENT PRIMARY KEY,
 contestId INT NOT NULL,
 userId INT NOT NULL,
 score INT,
 rank INT,
  prizeTitle VARCHAR(255),
   prizeDescription TEXT,
 createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )
      ;
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql("DROP TABLE IF EXISTS winners;", callback);
};
