# Деплой на cPanel (LiteSpeed)

## 1. Загрузить файлы

Через FTP/File Manager загрузить содержимое папки `swiftmatch1cpanel` в **application root** на хостинге (например `/home/user/swiftmatch`).

## 2. Настроить Node.js в cPanel

1. **Setup Node.js App** → Create Application
2. **Application root**: `/home/user/swiftmatch`
3. **Application URL**: ваш домен
4. **Application startup file**: `server.js`
5. **Passenger log file**: `app.log`
6. Нажать Create

## 3. Установить зависимости

```bash
cd ~/swiftmatch
npm install
```

## 4. Создать БД в cPanel MySQL

1. **MySQL Databases** → создать БД `swiftmatch`
2. Создать пользователя → добавить к БД с **ALL PRIVILEGES**
3. Импортировать схему:
   ```bash
   mysql -u swiftmatch_user -p swiftmatch < mysql_schema.sql
   ```

## 5. Настроить .env

Скопировать `.env.example` → `.env` и заполнить:

- `JWT_SECRET` — случайная строка
- `DB_USER`, `DB_PASSWORD` — из cPanel MySQL
- `APP_URL`, `CORS_ORIGIN` — ваш домен
- `VAPID_*` — оставить пустыми (push не будет работать без HTTPS)

## 6. Заполнить demo-данные

```bash
npm run seed
```

## 7. Перезапустить приложение

В cPanel: Setup Node.js App → Restart

## Структура

```
/home/user/swiftmatch/
├── server.js          # Entry point (Node.js)
├── package.json
├── .env               # Настройки
├── seed-users.cjs     # Скрипт для demo-данных
├── src/               # API сервер
│   ├── routes/
│   ├── db.js
│   ├── middleware.js
│   └── ...
└── public/            # Фронтенд (собранный)
    ├── index.html
    ├── assets/
    └── .htaccess      # SPA fallback
```
