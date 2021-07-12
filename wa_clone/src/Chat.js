import { Avatar, IconButton } from '@material-ui/core';
import { AttachFile, Mic, SearchOutlined } from '@material-ui/icons';
import MoreVert from '@material-ui/icons/MoreVert';
import React from 'react'
import './Chat.css';
import InsertEmoticonIcon from '@material-ui/icons/InsertEmoticon';
import {useState} from 'react';

function Chat() {

    const [input , setInput] = useState();
    return (
        <div className="chat">
           <div className="chat__header">
             <Avatar/>

             <div className="chat__headerInfo">
               <h3>Room Name</h3>
               <p>Last seen at...</p>
             </div>

             <div className="chatHeaderRight">
             
               <IconButton>
                 <SearchOutlined/>
               </IconButton>

               <IconButton>
                 <AttachFile/>
               </IconButton>

               <IconButton>
                 <MoreVert/>
               </IconButton>
             
             </div>
           </div>

           <div className="chat__body">
              <p className="chat__message">
                 <span className="chat__name">Sonny</span>
                 This is a message
                 <span className="chat__timestamp">
                  {new Date().toUTCString()}
                 </span>
              </p>

              <p className="chat__message chat__reply">
                 <span className="chat__name">Sonny</span>
                 This is a message
                 <span className="chat__timestamp">
                  {new Date().toUTCString()}
                 </span>
              </p>

              <p className="chat__message">
                 <span className="chat__name">Sonny</span>
                 This is a message
                 <span className="chat__timestamp">
                  {new Date().toUTCString()}
                 </span>
              </p>

           </div>

           <div className="chat__footer">
             <InsertEmoticonIcon/>
             <form>
              <input type="text" value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Type a message"/>
               <button type="submit">Send Message</button>
             </form>
             <Mic/>
           </div>

        </div>
    )
}

export default Chat;
