function openChat(user1, user2) {
    const chatId = [user1, user2].sort().join('_')

    if (!window.chats) window.chats = {}

    if (!window.chats[chatId]) {
        window.chats[chatId] = {
            users: [user1, user2]
        }
    }

    return window.chats[chatId]
}