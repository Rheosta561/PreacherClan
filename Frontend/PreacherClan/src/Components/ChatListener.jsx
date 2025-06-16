import React from 'react'
import { useChat } from '../context/ChatContext'

function ChatListener() {
    useChat();
    
  return (
    null
  )
}

export default ChatListener