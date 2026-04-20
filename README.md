# 💬 NexusChat — Мессенджер

Веб-мессенджер на **React + Node.js + MongoDB + Socket.IO**.

---

## 🐛 Что было исправлено

| # | Файл | Проблема | Исправление |
|---|------|----------|-------------|
| 1 | `frontend/src/api.js` | Жёстко прописан `http://localhost:3001` — у других пользователей не работало | Заменено на `import.meta.env.VITE_API_URL \|\| ''` |
| 2 | `frontend/src/pages/Messenger.jsx` | Socket.IO подключался к `localhost:3001` | Заменено на `import.meta.env.VITE_API_URL \|\| window.location.origin` |
| 3 | `backend/src/server.js` | `typing:start` слал событие в `user:{chatId}` — несуществующую комнату | Теперь запрашиваем участников чата из БД и шлём каждому в `user:{userId}` |
| 4 | `frontend/src/components/ChatWindow.jsx` | Удаление слало DELETE на `/api/chats/{msgId}` — неверный маршрут | Исправлено на `/api/messages/{msgId}` |
| 5 | `backend/src/routes/` | Не было отдельного маршрута для удаления сообщений | Создан `messageDelete.js` — `DELETE /api/messages/:id` |
| 6 | `frontend/src/components/MessageBubble.jsx` | Ссылки на файлы тоже содержали `localhost:3001` | Теперь использует `fileUrl()` из `api.js` |

---

## ⚡ Быстрый старт (локально)

### 1. MongoDB
Установи и запусти [MongoDB Community](https://www.mongodb.com/try/download/community):
```bash
# Windows — запускается как служба автоматически после установки
# или вручную:
mongod --dbpath C:\data\db
```

### 2. Бэкенд
```bash
cd backend
copy .env.example .env      # Windows
# или: cp .env.example .env  # Mac/Linux
npm install
npm run dev
```
Сервер стартует на **http://localhost:3001**

### 3. Фронтенд
```bash
cd frontend
npm install
npm run dev
```
Открой **http://localhost:3000**

> 💡 Чтобы проверить чат — открой **второй браузер в режиме инкогнито**,
> зарегистрируй второго пользователя и пиши между ними.

---

## ❓ Заработает ли у других по ссылке?

**Сейчас — нет.** `localhost` виден только тебе на твоём компьютере.

Чтобы другие заходили по ссылке — нужно задеплоить на сервер.

---

## 🚀 Деплой на Railway (бесплатно)

### Шаг 1 — MongoDB Atlas (облачная БД)
1. Зайди на [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Создай бесплатный кластер (M0 Free)
3. Создай пользователя БД → получи строку подключения вида:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nexuschat`

### Шаг 2 — Собери фронтенд в бэкенд
Добавь в конец `backend/src/server.js` (перед `mongoose.connect`):
```js
// Раздаём собранный фронтенд
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}
```

Собери фронтенд:
```bash
cd frontend
npm run build
```

### Шаг 3 — Railway
1. Залей код на [GitHub](https://github.com)
2. Зайди на [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Выбери репозиторий
4. Добавь переменные окружения:
   - `MONGO_URL` = строка из Atlas
   - `JWT_SECRET` = любая длинная случайная строка
   - `PORT` = 3001
5. Deploy! Railway даст тебе ссылку вида `https://nexuschat-xxx.up.railway.app`
6. Эту ссылку можно давать другим людям ✅

---

## 📁 Структура проекта

```
project/
├── backend/
│   ├── src/
│   │   ├── server.js              ← главный файл сервера
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Chat.js
│   │   │   └── Message.js
│   │   ├── middleware/
│   │   │   ├── auth.js            ← проверка JWT токена
│   │   │   └── upload.js          ← загрузка файлов (multer)
│   │   └── routes/
│   │       ├── auth.js            ← /api/register, /api/login
│   │       ├── users.js           ← /api/users
│   │       ├── chats.js           ← /api/chats
│   │       ├── messages.js        ← /api/chats/:id/messages
│   │       └── messageDelete.js   ← /api/messages/:id (DELETE)
│   ├── storage/uploads/           ← загруженные файлы
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api.js                 ← HTTP клиент
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Messenger.jsx
    │   └── components/
    │       ├── ChatList.jsx
    │       ├── ChatWindow.jsx
    │       └── MessageBubble.jsx
    ├── .env.example
    └── package.json
```

---

## 🔌 API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход |
| GET | `/api/users/me` | Данные текущего пользователя |
| GET | `/api/users?q=` | Поиск пользователей |
| GET | `/api/chats` | Список чатов |
| POST | `/api/chats` | Создать чат или группу |
| PUT | `/api/chats/:id/members` | Добавить участника в группу |
| GET | `/api/chats/:id/messages` | История сообщений |
| POST | `/api/chats/:id/messages` | Отправить сообщение (+ файлы) |
| DELETE | `/api/messages/:id` | Удалить своё сообщение |
| GET | `/api/online` | Список онлайн пользователей |

## 📡 Socket.IO события

| Событие | Направление | Описание |
|---------|-------------|----------|
| `message:new` | сервер → клиент | Новое сообщение |
| `message:deleted` | сервер → клиент | Сообщение удалено |
| `chat:new` | сервер → клиент | Новый чат создан |
| `user:online` | сервер → клиент | Пользователь вошёл |
| `user:offline` | сервер → клиент | Пользователь вышел |
| `typing:start` | клиент → сервер | Начал печатать |
| `typing:stop` | клиент → сервер | Перестал печатать |
