export async function startScreenShare(socket) {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    socket.emit('screen-share', stream)
}