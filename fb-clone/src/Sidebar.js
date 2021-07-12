import ExpandMore from '@material-ui/icons/ExpandMore';
import React from 'react'
import './Sidebar.css';
import SidebarRow from './SidebarRow';
import LocalHospitalIcon from '@material-ui/icons/LocalHospital';
import EmojiFlagsIcon from '@material-ui/icons/EmojiFlags';
import PeopleIcon from '@material-ui/icons/People';
import ChatIcon from '@material-ui/icons/Chat';
import StorefrontIcon from '@material-ui/icons/Storefront';
import VideoLibraryIcon from '@material-ui/icons/VideoLibrary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';


function Sidebar() {
    return (
        <div className = "sidebar">
          <SidebarRow src="https://i.pinimg.com/736x/9a/b6/a2/9ab6a2794d0ed343a4c5d489f5d9828d.jpg" title="Uzumaki Naruto"/>
          <SidebarRow Icon={LocalHospitalIcon} title="COVID-19 Information Center" />
          <SidebarRow Icon={EmojiFlagsIcon} title="Pages" />
          <SidebarRow Icon={PeopleIcon} title="Friends" />
          <SidebarRow Icon={ChatIcon} title="Messenger" />
          <SidebarRow Icon={StorefrontIcon} title="Marketplace" />
          <SidebarRow Icon={VideoLibraryIcon} title="Videos" />
          <SidebarRow Icon={ExpandMoreIcon} title="Marketplace" />

        </div>
    )
}

export default Sidebar
