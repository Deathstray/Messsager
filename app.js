// ====== ДАННЫЕ ======
let currentUser = null
let currentChat = null

const store = {
    users: [],
    chats: [],
    messages: [],
    favorites: {}
}

const uid = () => Math.random().toString(36).slice(2)

// ====== РЕГИСТРАЦИЯ ======
function register(name) {
    const user = {
        id: uid(),
        name,
        username: "@" + name + Math.floor(Math.random()*1000),
        avatar: ""
    }
    store.users.push(user)
    return user
}

// ====== ИНИЦИАЛИЗАЦИЯ ======
currentUser = register(prompt("Введите имя"))
const user2 = register("Aser")

// создаём чат
const chat = {
    id: uid(),
    members: [currentUser.id, user2.id],
    type: "private"
}
store.chats.push(chat)
currentChat = chat

renderUsers()

// ====== СООБЩЕНИЯ ======
function send() {
    const input = document.getElementById("messageInput")
    const text = input.value
    if (!text) return

    const msg = {
        id: uid(),
        chatId: currentChat.id,
        senderId: currentUser.id,
        text,
        replyTo: null,
        reactions: {},
        createdAt: new Date()
    }

    store.messages.push(msg)
    input.value = ""
    renderMessages()
}

// ====== РЕНДЕР СООБЩЕНИЙ ======
function renderMessages() {
    const el = document.getElementById("messages")
    el.innerHTML = ""

    const msgs = store.messages.filter(m => m.chatId === currentChat.id)

    msgs.forEach(m => {
        const div = document.createElement("div")
        div.className = "message " + (m.senderId === currentUser.id ? "own" : "")

        const user = store.users.find(u => u.id === m.senderId)

        div.innerHTML = `
      <b>${user.name}</b>: ${m.text}
      <br>
      <small>${new Date(m.createdAt).toLocaleTimeString()}</small>
    `

        // ПКМ меню
        div.oncontextmenu = (e) => {
            e.preventDefault()
            const action = prompt("1: Ответить 2: Переслать 3: Реакция")

            if (action == "1") {
                const reply = prompt("Ответ:")
                store.messages.push({
                    id: uid(),
                    chatId: currentChat.id,
                    senderId: currentUser.id,
                    text: "Ответ: " + reply,
                    replyTo: m.id,
                    reactions: {},
                    createdAt: new Date()
                })
            }

            if (action == "2") {
                store.messages.push({
                    ...m,
                    id: uid(),
                    createdAt: new Date()
                })
            }

            if (action == "3") {
                const emoji = prompt("Введите emoji")
                if (!m.reactions[emoji]) m.reactions[emoji] = []
                m.reactions[emoji].push(currentUser.id)
            }

            renderMessages()
        }

        el.appendChild(div)
    })
}

// ====== ПОЛЬЗОВАТЕЛИ ======
function renderUsers() {
    const el = document.getElementById("users")
    el.innerHTML = ""

    store.users.sort((a,b)=>a.name.localeCompare(b.name)).forEach(u => {
        const div = document.createElement("div")
        div.textContent = u.name + " (" + u.username + ")"
        el.appendChild(div)
    })
}

// ====== ПОИСК ======
document.getElementById("search").addEventListener("input", (e)=>{
    const val = e.target.value.toLowerCase()
    const el = document.getElementById("users")

    el.innerHTML = ""

    store.users
        .filter(u => u.name.toLowerCase().includes(val))
        .forEach(u=>{
            const div = document.createElement("div")
            div.textContent = u.name
            el.appendChild(div)
        })
})
