"use strict";

exports.up = function (db, callback) {
  db.runSql(
    `CREATE TABLE submissions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 userId INT NOT NULL,
 contestId INT NOT NULL,
 answers JSON,
 score INT DEFAULT 0,
 isSubmitted BOOLEAN DEFAULT FALSE,
 startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
 submittedAt DATETIME,
 createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (contestId) REFERENCES contests(id) ON DELETE CASCADE
 )
      ;
    `,
    callback
  );
};

exports.down = function (db, callback) {
  db.runSql("DROP TABLE IF EXISTS submissions;", callback);
};
