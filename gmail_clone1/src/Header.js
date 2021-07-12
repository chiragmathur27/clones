import React from 'react';
import MenuIcon from '@material-ui/icons/Menu';
import "./Header.css" ;
import { Avatar, IconButton } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import AppsIcon from '@material-ui/icons/Apps';
import NotificationsIcon from '@material-ui/icons/Notifications';

function Header() {
    return (
        <div className="header">
            <div className="header__left">
              <IconButton>
              <MenuIcon />
              </IconButton>
              <img src="https://akm-img-a-in.tosshub.com/indiatoday/images/story/202010/Google_Gmail_New_Logo_India_To_1200x768.jpeg?WgdQ3Tx7r4ZssTpgfxm1Iwb5KMAG8S4A&size=1200:675" />
            </div>

            <div className="header__middle">
             <SearchIcon/>
             <input type="text" placeholder="Search mail"/>
             <ArrowDropDownIcon className="header__inputCaret" />
            </div>

           <div className="header__right">
               <IconButton>
                   <AppsIcon />
               </IconButton>
               <IconButton>
                   <NotificationsIcon />
               </IconButton>
               <Avatar/>
            </div>
        </div>
    )
}

export default Header;
