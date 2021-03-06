import { Checkbox , IconButton } from '@material-ui/core';
import React from 'react'
import './EmailList.css';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import RedoIcon from '@material-ui/icons/Redo';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import SettingsIcon from '@material-ui/icons/Settings';
import KeyboardHideIcon from '@material-ui/icons/KeyboardHide';
import Section from './Section';
import InboxIcon from '@material-ui/icons/Inbox';
import PeopleIcon from '@material-ui/icons/People';
import LocalOfferIcon from '@material-ui/icons/LocalOffer';
import EmailRow from './EmailRow';

function EmailList() {
    return (
        <div className="emailList">
            <div className="emailList__settings">
              <div className="emailList__settingsLeft">
               <Checkbox/> 

               <IconButton>
                <ArrowDropDownIcon />
               </IconButton>

               <IconButton>
               <RedoIcon />
              </IconButton>

              <IconButton>
              <MoreVertIcon />
             </IconButton>

             <div className="emailList__settingsRight">
             <IconButton>
             <ChevronLeftIcon />
            </IconButton>

            <IconButton>
            <ChevronRightIcon />
           </IconButton>

            <IconButton>
             <KeyboardHideIcon />
            </IconButton>

           <IconButton>
           <SettingsIcon />
          </IconButton>
             </div>

              </div>
            </div>
          <div className="emailList__sections">
           <Section Icon={InboxIcon} title="Primary" color="red" Selected />
           <Section Icon={PeopleIcon} title="Social" color="#1A73E8" />
           <Section Icon={LocalOfferIcon} title="Promotions" color="green"  />
          </div>
          
          <div className="emailList__list">
          <EmailRow
          title="Twitch"
          subject="Hey fellow streamer!!!"
          description="This is a test"
          time="10pm"
          />
          <EmailRow
          title="Twitch"
          subject="Hey fellow streamer!!!"
          description="This is a testThis is a testThis is a test "
          time="10pm"
          />
          </div>
        </div>
    )
}

export default EmailList
