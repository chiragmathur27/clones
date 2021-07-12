import React from 'react'
import './Section.css';

 function Section( {Icon , title ,color , Selected} ) {
    return (
        <div className={`section ${Selected && "section--selected"}`}
        style={{ 
            borderBottom : `3px solid ${color}`,
            color: `${Selected && color}`,

        }}>

        <Icon/>
        <h4>{title}</h4>
            
        </div>
    )
}
export default Section;
