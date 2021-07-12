import React from 'react'
import './Widget.css';

function Widget() {
    return (
        <div className="widget">
            <iframe

               src="https://i.pinimg.com/originals/aa/36/26/aa36264b4d54ea10abdf692407d45a24.jpg"
               width="500"
               height="100%"
               style={{border:"none" , overflow:"hidden"}}
               scrolling="no"
               frameborder="0"
               allowTransparency="true"
               allow="encrypted-media"

            ></iframe>
        </div>
    )
}

export default Widget
