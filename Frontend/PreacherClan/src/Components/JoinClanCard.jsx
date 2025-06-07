import React from 'react'


function JoinClanCard(props) {
  return (
    <div className='text-white h-full w-full relative'>
        <img src="https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFjayUyMHdvcmtvdXR8ZW58MHx8MHx8fDA%3D" className='h-full w-full absolute object-cover brightness-75 rounded-lg ' alt="" />
        <div className='relative p-4 flex flex-col h-full justify-between'>
            <div className='w-full flex justify-between'>4.2 *
                <p className=''><span>Certified</span>
                <p className='text-xs underline'>Learn More</p></p>
            </div>
            <div className='text-xl font-semibold'>Pack Physique
                <p className='text-xs font-medium text-zinc-200'>Delhi , India</p>
                <p className='text-xs font-medium text-zinc-200'>+91 7303036689</p>
            </div>
        </div>
    </div>
  )
}

export default JoinClanCard