import { Avatar } from '@material-ui/core';
import React from 'react'
import './Post.css';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import CommentIcon from '@material-ui/icons/Comment';
import NearMeIcon from '@material-ui/icons/NearMe';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

function Post({profilePic , image , username , timestamp , message}) {
    return (
        <div className="post">
            <div className="post__top">
               <Avatar src={profilePic} className="post__avatar" />
               <div className="post__topInfo">
                <h3>{username}</h3>
                <p>Time</p>
               </div>
            </div>

            <div className="post__bottom">
              <p>{message}</p>
            </div>

            <div className="post__image">
              <img src={image}/>
            </div>

            <div className="post__options">
                <div className="post__option">
                   <ThumbUpIcon/>
                   <p>Like</p>
                </div>

                <div className="post__option">
                   <CommentIcon/>
                   <p>Comments</p>
                </div>

                <div className="post__option">
                   <NearMeIcon/>
                   <p>Share</p>
                </div>

                <div className="post__option">
                   <AccountCircleIcon/>
                   <ExpandMoreIcon/>   
                </div>

            </div>

        </div>
    )
}

export default Post
