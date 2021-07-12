import React from 'react'
import './SidebarOptions.css';

function SidebarOptions({ Icon, title, number, Selected }) {
    return ( <
        div className = {`
        sidebarOptions 
        ${Selected && "sidebarOptions--active"}  
        `}>
        <Icon / >
        <h3 > { title } </h3>
         <p> { number } </p> 
         </div>
    )
}

export default SidebarOptions;