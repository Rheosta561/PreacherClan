import React from 'react'

function GymCard() {
  return (
    <div className='w-full h-fit  p-2 bg-zinc-900 bg-opacity-45 rounded-lg max-w-md'>
        <div className='flex gap-4 '>
            <div className='h-20 w-20  rounded-full'>
                <img src="https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFjayUyMHdvcmtvdXR8ZW58MHx8MHx8fDA%3D" className='h-full w-full object-cover rounded-full' alt="" />
            </div>
            <div className=' w-3/4'>
            <h1 className='text-xl font-medium'>Pack Physique</h1>
            <p className='text-xs text-zinc-300'>Delhi , India</p>
            <p className='text-sm mt-1 font-semibold text-zinc-300'>Trainer , Since 2020</p>
            </div>
        </div>
        
    </div>
  )
}

export default GymCard