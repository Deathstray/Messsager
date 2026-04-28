import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Profile() {
    const { id } = useParams()
    const [user, setUser] = useState(null)

    useEffect(() => {
        axios.get('/users/' + id).then(r => setUser(r.data))
    }, [id])

    if (!user) return null

    return (
        <div>
            <img src={user.avatar} />
            <h2>{user.nickname}</h2>
        </div>
    )
}