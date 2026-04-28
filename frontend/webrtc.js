import { socket } from './socket'

let peerConnection

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
}

export async function startScreenShare(targetId, localVideo) {
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
    })

    localVideo.srcObject = stream

    peerConnection = new RTCPeerConnection(servers)

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
    })

    peerConnection.onicecandidate = e => {
        if (e.candidate) {
            socket.emit('ice-candidate', {
                to: targetId,
                candidate: e.candidate
            })
        }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    socket.emit('offer', { to: targetId, offer })
}

export function initWebRTC() {
    socket.on('offer', async data => {
        peerConnection = new RTCPeerConnection(servers)

        peerConnection.ontrack = e => {
            document.getElementById('remoteVideo').srcObject = e.streams[0]
        }

        await peerConnection.setRemoteDescription(data.offer)

        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        socket.emit('answer', {
            to: data.from,
            answer
        })
    })

    socket.on('answer', async data => {
        await peerConnection.setRemoteDescription(data.answer)
    })

    socket.on('ice-candidate', async data => {
        if (data.candidate) {
            await peerConnection.addIceCandidate(data.candidate)
        }
    })
}