const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const USERS = [
  { id: 2,  email: 'demo@mail.ru',     name: 'Анна',       gender: 'female', age: 28, city: 'Москва',       avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3,  email: 'demo3@mail.ru',    name: 'Александр',   gender: 'male',   age: 30, city: 'Санкт-Петербург', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 4,  email: 'user4@demo.ru',    name: 'Екатерина',   gender: 'female', age: 26, city: 'Москва',       avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { id: 5,  email: 'user5@demo.ru',    name: 'Дмитрий',     gender: 'male',   age: 32, city: 'Казань',       avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
  { id: 6,  email: 'user6@demo.ru',    name: 'Ольга',       gender: 'female', age: 24, city: 'Новосибирск',  avatar: 'https://randomuser.me/api/portraits/women/26.jpg' },
  { id: 7,  email: 'user7@demo.ru',    name: 'Максим',      gender: 'male',   age: 29, city: 'Екатеринбург', avatar: 'https://randomuser.me/api/portraits/men/46.jpg' },
  { id: 8,  email: 'user8@demo.ru',    name: 'Анастасия',   gender: 'female', age: 27, city: 'Краснодар',    avatar: 'https://randomuser.me/api/portraits/women/50.jpg' },
  { id: 9,  email: 'user9@demo.ru',    name: 'Иван',        gender: 'male',   age: 31, city: 'Ростов-на-Дону', avatar: 'https://randomuser.me/api/portraits/men/91.jpg' },
  { id: 10, email: 'user10@demo.ru',   name: 'Мария',       gender: 'female', age: 25, city: 'Уфа',          avatar: 'https://randomuser.me/api/portraits/women/17.jpg' },
  { id: 11, email: 'user11@demo.ru',   name: 'Сергей',      gender: 'male',   age: 33, city: 'Воронеж',      avatar: 'https://randomuser.me/api/portraits/men/52.jpg' },
  { id: 12, email: 'user12@demo.ru',   name: 'Татьяна',     gender: 'female', age: 23, city: 'Самара',       avatar: 'https://randomuser.me/api/portraits/women/63.jpg' },
  { id: 13, email: 'user13@demo.ru',   name: 'Артём',       gender: 'male',   age: 27, city: 'Нижний Новгород', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { id: 14, email: 'user14@demo.ru',   name: 'Виктория',    gender: 'female', age: 29, city: 'Челябинск',    avatar: 'https://randomuser.me/api/portraits/women/90.jpg' },
  { id: 15, email: 'user15@demo.ru',   name: 'Алексей',     gender: 'male',   age: 26, city: 'Омск',         avatar: 'https://randomuser.me/api/portraits/men/94.jpg' },
  { id: 16, email: 'user16@demo.ru',   name: 'Дарья',       gender: 'female', age: 30, city: 'Волгоград',    avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
  { id: 19, email: 'user19@demo.ru',   name: 'Кирилл',      gender: 'male',   age: 28, city: 'Пермь',        avatar: 'https://randomuser.me/api/portraits/men/97.jpg' },
  { id: 20, email: 'user20@demo.ru',   name: 'Алина',       gender: 'female', age: 25, city: 'Тюмень',       avatar: 'https://randomuser.me/api/portraits/women/56.jpg' },
  { id: 21, email: 'user21@demo.ru',   name: 'Павел',       gender: 'male',   age: 31, city: 'Барнаул',      avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
  { id: 22, email: 'user22@demo.ru',   name: 'Матвей',      gender: 'male',   age: 24, city: 'Иркутск',      avatar: 'https://randomuser.me/api/portraits/men/39.jpg' },
  { id: 23, email: 'user23@demo.ru',   name: 'Елизавета',   gender: 'female', age: 26, city: 'Хабаровск',    avatar: 'https://randomuser.me/api/portraits/women/24.jpg' },
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'swiftmatch',
    waitForConnections: true,
  });

  const passHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  let count = 0;

  for (const u of USERS) {
    await pool.query(
      `INSERT INTO users (id, email, password, name, is_active, role)
       VALUES (?, ?, ?, ?, 1, 'user')
       ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1`,
      [u.id, u.email, passHash, u.name]
    );

    await pool.query(
      `INSERT INTO user_profiles (user_id, display_name, age, gender, city, avatar, online, looking_for)
       VALUES (?, ?, ?, ?, ?, ?, 0, 'male')
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), age = VALUES(age), gender = VALUES(gender), city = VALUES(city), avatar = VALUES(avatar)`,
      [u.id, u.name, u.age, u.gender, u.city, u.avatar]
    );

    count++;
  }

  console.log(`Seeded ${count} users`);
  await pool.end();
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
