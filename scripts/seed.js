require('dotenv').config();
const pool = require('../db');
const bcrypt = require('bcrypt');

(async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Create users
    const password = 'Pass1234';
    const hash = await bcrypt.hash(password, 10);

    const users = [
      { name: 'Admin User', email: 'admin@example.com', role: 'admin', pw: hash },
      { name: 'VIP User', email: 'vip@example.com', role: 'vip', pw: hash },
      { name: 'Normal User', email: 'user@example.com', role: 'user', pw: hash },
    ];

    const insertedUsers = [];
    for (const u of users) {
      const [r] = await conn.query('INSERT INTO users (name,email,passwordHash,role) VALUES (?,?,?,?)', [u.name, u.email, u.pw, u.role]);
      insertedUsers.push({ id: r.insertId, email: u.email, name: u.name });
    }

    // 2) Create a contest that already ended (so we can finalize)
    const startAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
    const endAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 1); // 1 day ago

    const [contestRes] = await conn.query(
      'INSERT INTO contests (name, description, accessLevel, startAt, endAt, prizeTitle, prizeDescription, prizeQuantity, createdBy) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        'Seeded Contest',
        'This is a seeded contest for testing',
        'normal',
        startAt,
        endAt,
        'Gift Voucher',
        'Prize for top scorer',
        2, // prizeQuantity
        insertedUsers[0].id // created by admin
      ]
    );
    const contestId = contestRes.insertId;

    // 3) Create questions
    const questions = [
      {
        text: 'What is 2+2?',
        type: 'single',
        options: [{ id: 'o1', text: '3' }, { id: 'o2', text: '4' }, { id: 'o3', text: '5' }],
        correctOptions: ['o2'],
        points: 1
      },
      {
        text: 'Select primes',
        type: 'multi',
        options: [{ id: 'm1', text: '2' }, { id: 'm2', text: '4' }, { id: 'm3', text: '3' }],
        correctOptions: ['m1','m3'],
        points: 2
      },
      {
        text: 'The sky is blue',
        type: 'tf',
        options: [{ id: 't1', text: 'true' }, { id: 't2', text: 'false' }],
        correctOptions: ['true'],
        points: 1
      }
    ];

    for (const q of questions) {
      await conn.query('INSERT INTO questions (contestId,text,type,options,correctOptions,points) VALUES (?,?,?,?,?,?)',
        [contestId, q.text, q.type, JSON.stringify(q.options), JSON.stringify(q.correctOptions), q.points]);
    }

    // 4) Create submissions: give Normal User 1 correct, VIP user 0 correct -> so Normal wins
    // Find question ids:
    const [qRows] = await conn.query('SELECT id, text FROM questions WHERE contestId = ?', [contestId]);
    // Build sample answers for user (user is insertedUsers[2])
    const answersForUser = [
      { questionId: qRows[0].id, selectedOptions: ['o2'] }, // correct
      { questionId: qRows[1].id, selectedOptions: ['m1','m3'] }, // correct
      { questionId: qRows[2].id, selectedOptions: ['true'] } // correct
    ];
    const answersForVip = [
      { questionId: qRows[0].id, selectedOptions: ['o1'] }, // wrong
      { questionId: qRows[1].id, selectedOptions: ['m2'] }, // wrong
      { questionId: qRows[2].id, selectedOptions: ['false'] } // wrong
    ];

    // Insert submission for normal user (fully correct)
    await conn.query('INSERT INTO submissions (userId,contestId,answers,score,isSubmitted,startedAt,submittedAt) VALUES (?,?,?,?,?,?,?)',
      [insertedUsers[2].id, contestId, JSON.stringify(answersForUser), 4, 1, new Date(), new Date()]); // score: sum of points (1+2+1=4)

    // Insert submission for vip user (all wrong)
    await conn.query('INSERT INTO submissions (userId,contestId,answers,score,isSubmitted,startedAt,submittedAt) VALUES (?,?,?,?,?,?,?)',
      [insertedUsers[1].id, contestId, JSON.stringify(answersForVip), 0, 1, new Date(), new Date()]);

    await conn.commit();
    console.log('Seed completed. Sample users:');
    console.log(insertedUsers);
    console.log('Password for seeded users is:', password);
    conn.release();
    process.exit(0);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
