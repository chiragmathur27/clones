import React from 'react'
import './Feed.css';
import StoryReel from "./StoryReel"
import MessageSender from "./MessageSender"
import Post from "./Post"

function Feed() {
    return (
        <div className="feed">
            <StoryReel/>
            <MessageSender/>
            <Post
              profilePic="https://i.pinimg.com/736x/9a/b6/a2/9ab6a2794d0ed343a4c5d489f5d9828d.jpg"
              message="Wowww this works!!"
              timestamp="timestamp"
              username="Chirag"
              image="https://i.pinimg.com/736x/fa/3e/17/fa3e17223ad7e775faa529eb578e54ba.jpg"
            />

            <Post
            profilePic="https://i.pinimg.com/736x/9a/b6/a2/9ab6a2794d0ed343a4c5d489f5d9828d.jpg"
              message="Wowww this works!!"
              timestamp="timestamp"
              username="Chirag"
            />
        </div>
    )
}

export default Feed
