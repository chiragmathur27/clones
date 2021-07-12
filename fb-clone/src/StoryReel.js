import React from 'react'
import './StoryReel.css';
import Story from './Story';

function StoryReel() {
    return (
        <div className="storyReel">
            <Story
              image="https://i.pinimg.com/736x/fa/3e/17/fa3e17223ad7e775faa529eb578e54ba.jpg"
              profileSrc="https://i.pinimg.com/736x/9a/b6/a2/9ab6a2794d0ed343a4c5d489f5d9828d.jpg"
              title="Uzumaki Naruto"
            />

            <Story
              image="https://i.pinimg.com/originals/e8/e5/4b/e8e54b7d91eece6032ef634092fdae91.png"
              profileSrc="https://i.pinimg.com/736x/0c/51/ee/0c51eebf5d65cbabac1a15d09e73104c.jpg"
              title="Hinata Shouyo"
            />
        </div>
    )
}

export default StoryReel
