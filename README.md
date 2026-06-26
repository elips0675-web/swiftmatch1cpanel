# SwiftMatch

Дейтинг-приложение на Node.js + React (Vite) + MySQL. Готово к деплою на cPanel (LiteSpeed).

---

## Возможности

- Регистрация, вход, восстановление пароля (JWT + refresh tokens)
- Анкета с фото, интересами, целями, зодиаком, образованием
- Поиск по городу, фильтры, георадиус
- Лайки, мэтчи, чаты (real-time через Socket.IO)
- Премиум-подписка (Plus/Gold/Platinum) — Stripe Checkout + mock
- Уведомления: push (VAPID) + email (Nodemailer)
- Админка: пользователи, контент, фичи, рассылки, жалобы, аналитика
- i18n: RU / EN
- WebSocket: онлайн-статус, печатает, real-time сообщения
- Безопасность: helmet, rate-limit, bcrypt, параметризованные SQL, Request ID

---

## Быстрый старт (cPanel)

### 1. Загрузить файлы

Загрузить всё содержимое репозитория через FTP в **application root** (например `/home/user/swiftmatch`).

### 2. Настроить Node.js

В cPanel: **Setup Node.js App** → **Create Application**

| Поле | Значение |
|------|----------|
| Application root | `/home/user/swiftmatch` |
| Application URL | ваш домен |
| Application startup file | `server.js` |
| Passenger log file | `app.log` |

### 3. Установить зависимости

```bash
cd ~/swiftmatch
npm install
```

### 4. Создать БД

В cPanel: **MySQL Databases** → создать БД `swiftmatch` + пользователя с **ALL PRIVILEGES**

Импортировать схему (файл `database/mysql_schema.sql` из основного репозитория):

```bash
mysql -u swiftmatch_user -p swiftmatch < mysql_schema.sql
```

### 5. Настроить .env

```bash
cp .env.example .env
```

Заполнить:

| Переменная | Значение |
|------------|----------|
| `JWT_SECRET` | случайная строка (`openssl rand -hex 32`) |
| `DB_USER` | пользователь MySQL |
| `DB_PASSWORD` | пароль MySQL |
| `APP_URL` | `https://ваш-домен` |
| `CORS_ORIGIN` | `https://ваш-домен` |

### 6. Заполнить demo-данные

```bash
npm run seed
```

После seed доступны:

| Email | Пароль | Роль |
|-------|--------|------|
| `admin@mail.ru` | `admin123` | Админ |
| `demo@mail.ru` | `admin123` | Анна (пользователь) |
| `user4@demo.ru` … `user23@demo.ru` | `admin123` | 18 демо-пользователей |

### 7. Перезапустить

В cPanel: **Setup Node.js App** → **Restart**

---

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/profile/:id` | Анкета пользователя |
| PUT | `/api/profile/:id` | Обновление анкеты |
| POST | `/api/upload` | Загрузка фото |
| GET | `/api/search` | Поиск (фильтры, радиус) |
| POST | `/api/like` | Лайк |
| GET | `/api/matches` | Список мэтчей |
| GET | `/api/chats` | Список чатов |
| POST | `/api/chats` | Создать чат |
| POST | `/api/chats/:id/messages` | Отправить сообщение |
| POST | `/api/premium/create-checkout` | Купить премиум |
| GET | `/api/admin/users` | Список пользователей (админка) |

Полный список — в `src/routes/`.

---

## Логи

Все логи — структурированный JSON (stdout/stderr):

```json
{"ts":"2026-06-26T09:00:00.000Z","level":"info","msg":"SwiftMatch API running on port 3001","rid":"bootstrap"}
```

Каждый запрос получает `X-Request-Id` header. Читать логи:

```bash
tail -f ~/swiftmatch/app.log | jq .
```

---

## Обновление фронтенда

На локальной машине собрать и перезалить `public/`:

```bash
cd swiftmatch1bddomadm
npx vite build --outDir D:\swiftmatch1cpanel\public
```

Либо на хостинге (если есть доступ к npm):

```bash
cd ~/swiftmatch
npm run build
```

---

## Требования

- Node.js ≥ 18 (LTS)
- MySQL ≥ 8.0
- npm ≥ 9

---

## Структура

```
/home/user/swiftmatch/
├── server.js              # Entry point (Express API + статика)
├── package.json
├── .env                   # Настройки продакшена
├── seed-users.cjs         # Скрипт demo-данных
├── src/                   # API сервер
│   ├── routes/            #   auth, profile, chats, premium, admin...
│   ├── db.js              #   MySQL pool
│   ├── ws.js              #   Socket.IO
│   ├── middleware.js       #   JWT auth
│   └── logger.js          #   Структурированные логи
├── public/                # Фронтенд (собранный Vite)
│   ├── index.html
│   ├── assets/
│   └── .htaccess          # SPA fallback
└── README.md
```
