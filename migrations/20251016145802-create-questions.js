"use strict";

exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE questions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 contestId INT NOT NULL,
 text TEXT NOT NULL,
 type ENUM('single','multi','tf') NOT NULL,
 options JSON,
 correctOptions JSON,
 points INT DEFAULT 1,
 FOREIGN KEY (contestId) REFERENCES contests(id) ON DELETE CASCADE
);
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql("DROP TABLE IF EXISTS questions;", callback);
};
