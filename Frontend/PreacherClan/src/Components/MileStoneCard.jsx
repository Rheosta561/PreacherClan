import React from 'react'

function MileStoneCard() {
  return (
    <div className='min-h-44 h-fit w-full max-w-md  '>
        <div className='min-h-44 h-fit bg-zinc-900 bg-opacity-40 w-full p-2 rounded-lg '>
            <h1 className='text-2xl font-semibold text-zinc-200'>Warrior's Chronicle</h1>
            <div className='h-full w-full  p-2 '>
                <p className='text-center font-semibold'>Streak | <span>20</span></p>
                <p className='text-xs text-zinc-300 text-center'>Number of workout hits in the month</p>
                <hr className=' w-3/4 mx-auto mt-1  border-zinc-700' />

                <p className='text-center font-semibold mt-2'>Preacher Score | <span>400</span></p>
                <p className='text-xs text-zinc-300 text-center'>Number of workout hits in the month</p>
                <hr className=' w-3/4 mx-auto mt-1  border-zinc-700' />

            </div>
        </div>
    </div>
  )
}

export default MileStoneCard