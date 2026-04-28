export default function Message({ msg }) {
    return (
        <div className="message">
            <img src={msg.avatar} className="avatar" />
            <div className="content">
                <div className="header">
                    <span className="name">{msg.nickname}</span>
                </div>
                <div
                    className="text"
                    onContextMenu={() =>
                        navigator.clipboard.writeText(msg.text)
                    }
                >
                    {msg.text}
                </div>
            </div>
        </div>
    )
}