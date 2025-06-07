import React from 'react'

function SearchResult(props) {
  return (
    <div>
        <div className='w-full p-2  h-14 flex items-center gap-4 text-sm text-zinc-100'>
        <div className='h-10 w-10 bg-zinc-950 rounded-full'>
            <img src={`${props.image}`} alt="" className='h-full w-full rounded-full' />
        </div>
        <div>{props.name} | {props.city} , {props.country}</div>

    </div>
   


    </div>
    
  )
}

export default SearchResult